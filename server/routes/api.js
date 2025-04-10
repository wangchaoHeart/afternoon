const express = require('express');
const router = express.Router();
const { WebSocketServer } = require('ws');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

// 文件存储路径
const DATA_DIR = path.join(__dirname, '../data');
const CURRENT_VOTE_FILE = path.join(DATA_DIR, 'current_vote.json');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

// WebSocket 客户端集合
const clients = new Set();

// 确保数据目录存在
const ensureDirectories = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(HISTORY_DIR, { recursive: true });
  } catch (err) {
    console.error('创建数据目录失败:', err);
  }
};

// 读取当前投票数据
const readVoteData = async () => {
  try {
    await ensureDirectories();
    try {
      await fs.access(CURRENT_VOTE_FILE);
    } catch (err) {
      const today = moment().format('YYYY-MM-DD');
      const defaultData = {
        date: today,
        options: [],
        votes: {},
        votedUsers: [],
        userVotes: {}
      };
      await fs.writeFile(CURRENT_VOTE_FILE, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const data = await fs.readFile(CURRENT_VOTE_FILE, 'utf8');
    const voteData = JSON.parse(data);
    const today = moment().format('YYYY-MM-DD');
    if (voteData.date !== today) {
      console.log(`检测到历史数据(${voteData.date})，正在检查是否需要归档并重置为今日(${today})数据`);
      const isEmpty = voteData.options.length === 0 && Object.keys(voteData.votes).length === 0;
      if (!isEmpty && voteData.date) {
        await archiveVoteData(voteData);
        console.log(`已归档 ${voteData.date} 的数据`);
      } else if (isEmpty) {
        console.log(`数据为空，跳过归档 ${voteData.date}`);
      }
      const newData = {
        date: today,
        options: [],
        votes: {},
        votedUsers: [],
        userVotes: {}
      };
      await fs.writeFile(CURRENT_VOTE_FILE, JSON.stringify(newData, null, 2));
      return newData;
    }
    return voteData;
  } catch (err) {
    console.error('读取投票数据失败:', err);
    throw err;
  }
};

// 写入当前投票数据
const writeVoteData = async (voteData) => {
  try {
    await ensureDirectories();
    await fs.writeFile(CURRENT_VOTE_FILE, JSON.stringify(voteData, null, 2));
  } catch (err) {
    console.error('写入投票数据失败:', err);
    throw err;
  }
};

// 归档投票数据到历史记录
const archiveVoteData = async (voteData) => {
  try {
    const historyFile = path.join(HISTORY_DIR, `${voteData.date}.json`);
    await fs.writeFile(historyFile, JSON.stringify(voteData, null, 2));
  } catch (err) {
    console.error('归档投票数据失败:', err);
    throw err;
  }
};

// 读取历史投票数据
const readVoteHistory = async () => {
  try {
    await ensureDirectories();
    const files = await fs.readdir(HISTORY_DIR);
    files.sort((a, b) => {
      const dateA = a.replace('.json', '');
      const dateB = b.replace('.json', '');
      return moment(dateB).diff(moment(dateA));
    });
    const history = [];
    for (const file of files) {
      const filePath = path.join(HISTORY_DIR, file);
      const data = await fs.readFile(filePath, 'utf8');
      history.push(JSON.parse(data));
    }
    return history;
  } catch (err) {
    console.error('读取历史投票数据失败:', err);
    throw err;
  }
};

// 广播数据给所有客户端（可排除特定客户端）
const broadcast = async (message, excludeWs = null) => {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1 && client !== excludeWs) {
      client.send(data);
    }
  }
};

// 更新并广播投票数据
const updateAndBroadcast = async (excludeWs = null) => {
  const voteData = await readVoteData();
  broadcast({
    type: 'voteUpdate',
    data: {
      date: voteData.date,
      options: voteData.options,
      votes: voteData.votes
    }
  }, excludeWs);
};

// 生成用户ID中间件
const generateUserId = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!req.cookies.userId) {
    const userId = uuidv4();
    res.cookie('userId', userId, { 
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true
    });
    req.userId = userId;
  } else {
    req.userId = req.cookies.userId;
  }
  req.clientIp = clientIp;
  next();
};

// 中间件：为所有路由添加用户 ID
router.use(generateUserId);

// 创建 WebSocket 服务器
const setupWebSocket = (server) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    clients.add(ws);

    // 发送初始投票数据
    readVoteData().then(voteData => {
      const userId = req.headers.cookie?.match(/userId=([^;]+)/)?.[1];
      const hasVoted = voteData.votedUsers.includes(userId);
      const userVote = hasVoted ? voteData.userVotes[userId]?.option : null;

      ws.send(JSON.stringify({
        type: 'init',
        data: {
          date: voteData.date,
          options: voteData.options,
          votes: voteData.votes,
          hasVoted,
          userVote
        }
      }));
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('message', async (message) => {
      try {
        const { type, data } = JSON.parse(message);
        const userId = req.headers.cookie?.match(/userId=([^;]+)/)?.[1];
        const voteData = await readVoteData();

        switch (type) {
          case 'addOption':
            if (voteData.options.includes(data.option)) {
              ws.send(JSON.stringify({ type: 'error', message: '该选项已存在' }));
              return;
            }
            voteData.options.push(data.option);
            voteData.votes[data.option] = 0;
            await writeVoteData(voteData);
            updateAndBroadcast();
            break;

          case 'vote':
            if (!voteData.options.includes(data.option)) {
              ws.send(JSON.stringify({ type: 'error', message: '选项不存在' }));
              return;
            }
            const hasVoted = voteData.votedUsers.includes(userId);
            if (hasVoted) {
              const previousOption = voteData.userVotes[userId].option;
              if (previousOption !== data.option) {
                voteData.votes[previousOption] -= 1;
                voteData.votes[data.option] += 1;
                voteData.userVotes[userId] = {
                  option: data.option,
                  ip: req.socket.remoteAddress,
                  timestamp: moment().toISOString()
                };
              }
            } else {
              voteData.votes[data.option] += 1;
              voteData.votedUsers.push(userId);
              voteData.userVotes[userId] = {
                option: data.option,
                ip: req.socket.remoteAddress,
                timestamp: moment().toISOString()
              };
            }
            await writeVoteData(voteData);

            // 单独通知投票用户
            ws.send(JSON.stringify({
              type: 'voteUpdate',
              data: {
                date: voteData.date,
                options: voteData.options,
                votes: voteData.votes,
                hasVoted: true,
                userVote: data.option
              }
            }));

            // 广播给其他客户端（排除当前投票用户）
            updateAndBroadcast(ws);
            break;

          case 'deleteOption':
            if (!voteData.options.includes(data.option)) {
              ws.send(JSON.stringify({ type: 'error', message: '选项不存在' }));
              return;
            }
            voteData.options = voteData.options.filter(opt => opt !== data.option);
            delete voteData.votes[data.option];
            for (const uid in voteData.userVotes) {
              if (voteData.userVotes[uid].option === data.option) {
                delete voteData.userVotes[uid];
                voteData.votedUsers = voteData.votedUsers.filter(id => id !== uid);
              }
            }
            await writeVoteData(voteData);
            updateAndBroadcast();
            break;
        }
      } catch (err) {
        console.error(err);
        ws.send(JSON.stringify({ type: 'error', message: '服务器错误' }));
      }
    });
  });
};

// REST API 用于获取历史数据
router.get('/votes/history', async (req, res) => {
  try {
    const history = await readVoteHistory();
    res.json({ history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = {
  router,
  setupWebSocket
};