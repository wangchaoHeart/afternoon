const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

// 文件存储路径
const DATA_DIR = path.join(__dirname, '../data');
const CURRENT_VOTE_FILE = path.join(DATA_DIR, 'current_vote.json');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

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
// 读取当前投票数据
// 读取当前投票数据
const readVoteData = async () => {
  try {
    await ensureDirectories();
    
    // 检查文件是否存在
    try {
      await fs.access(CURRENT_VOTE_FILE);
    } catch (err) {
      // 文件不存在，创建默认结构
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
    
    // 读取文件
    const data = await fs.readFile(CURRENT_VOTE_FILE, 'utf8');
    const voteData = JSON.parse(data);
    
    // 检查是否是今天的数据
    const today = moment().format('YYYY-MM-DD');
    if (voteData.date !== today) {
      console.log(`检测到历史数据(${voteData.date})，正在检查是否需要归档并重置为今日(${today})数据`);
      
      // 检查数据是否为空（没有选项或投票记录）
      const isEmpty = voteData.options.length === 0 && Object.keys(voteData.votes).length === 0;
      
      // 如果不是空数据且有日期，则归档
      if (!isEmpty && voteData.date) {
        await archiveVoteData(voteData);
        console.log(`已归档 ${voteData.date} 的数据`);
      } else if (isEmpty) {
        console.log(`数据为空，跳过归档 ${voteData.date}`);
      }
      
      // 创建新的今日数据
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
    
    // 读取历史目录中的所有文件
    const files = await fs.readdir(HISTORY_DIR);
    
    // 按日期排序（最新的在前）
    files.sort((a, b) => {
      const dateA = a.replace('.json', '');
      const dateB = b.replace('.json', '');
      return moment(dateB).diff(moment(dateA));
    });
    
    // 读取每个文件的内容
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

// 生成唯一用户 ID
const generateUserId = (req, res, next) => {
  // 获取客户端 IP 地址
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!req.cookies.userId) {
    const userId = uuidv4();
    res.cookie('userId', userId, { 
      maxAge: 365 * 24 * 60 * 60 * 1000, // 一年有效期
      httpOnly: true
    });
    req.userId = userId;
  } else {
    req.userId = req.cookies.userId;
  }

  // 将 IP 地址附加到 req 对象，供后续路由使用
  req.clientIp = clientIp;
  next();
};

// 中间件：为所有路由添加用户 ID
router.use(generateUserId);

// 获取投票数据
router.get('/votes', async (req, res) => {
  try {
    // 获取投票数据
    const voteData = await readVoteData();
    
    // 检查用户是否已投票
    const hasVoted = voteData.votedUsers.includes(req.userId);
    
    // 如果用户已投票，返回他们投的选项
    const userVote = hasVoted ? voteData.userVotes[req.userId] : null;
    
    res.json({
      date: voteData.date,
      options: voteData.options,
      votes: voteData.votes,
      hasVoted,
      userVote
    });readVoteData
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 添加新选项
router.post('/options', async (req, res) => {
  try {
    const { option } = req.body;
    
    if (!option || typeof option !== 'string' || option.trim() === '') {
      return res.status(400).json({ message: '选项不能为空' });
    }
    
    // 获取投票数据
    const voteData = await readVoteData();
    
    // 检查选项是否已存在
    if (voteData.options.includes(option)) {
      return res.status(400).json({ message: '该选项已存在' });
    }
    
    // 添加新选项
    voteData.options.push(option);
    voteData.votes[option] = 0;
    await writeVoteData(voteData);
    
    res.json({ 
      message: '添加成功', 
      options: voteData.options,
      votes: voteData.votes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 投票
router.post('/vote', async (req, res) => {
  try {
    const { option } = req.body;
    
    if (!option) {
      return res.status(400).json({ message: '请选择一个选项' });
    }
    
    const voteData = await readVoteData();
    
    if (!voteData.options.includes(option)) {
      return res.status(400).json({ message: '选项不存在' });
    }
    
    const hasVoted = voteData.votedUsers.includes(req.userId);
    
    if (hasVoted) {
      const previousOption = voteData.userVotes[req.userId].option;
      
      if (previousOption === option) {
        return res.json({
          message: '您已经选择了该选项',
          options: voteData.options,
          votes: voteData.votes,
          hasVoted: true,
          userVote: option
        });
      }
      
      voteData.votes[previousOption] -= 1;
      voteData.votes[option] += 1;
      voteData.userVotes[req.userId] = {
        option,
        ip: req.clientIp, // 更新 IP 地址
        timestamp: moment().toISOString() // 可选：记录投票时间
      };
    } else {
      voteData.votes[option] = (voteData.votes[option] || 0) + 1;
      voteData.votedUsers.push(req.userId);
      voteData.userVotes[req.userId] = {
        option,
        ip: req.clientIp, // 记录 IP 地址
        timestamp: moment().toISOString() // 可选：记录投票时间
      };
    }
    
    await writeVoteData(voteData);
    
    res.json({
      message: hasVoted ? '修改投票成功' : '投票成功',
      options: voteData.options,
      votes: voteData.votes,
      hasVoted: true,
      userVote: option
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除选项
router.post('/options/delete', async (req, res) => {
  try {
    const { option } = req.body;
    
    if (!option) {
      return res.status(400).json({ message: '请指定要删除的选项' });
    }
    
    // 获取投票数据
    const voteData = await readVoteData();
    
    // 检查选项是否存在
    if (!voteData.options.includes(option)) {
      return res.status(400).json({ message: '选项不存在' });
    }
    
    // 从选项列表中移除
    voteData.options = voteData.options.filter(opt => opt !== option);
    
    // 移除该选项的投票记录
    const voteCount = voteData.votes[option] || 0;
    delete voteData.votes[option];
    
    // 更新用户投票记录
    const affectedUsers = [];
    for (const userId in voteData.userVotes) {
      if (voteData.userVotes[userId] === option) {
        delete voteData.userVotes[userId];
        affectedUsers.push(userId);
      }
    }
    
    // 从已投票用户列表中移除受影响的用户
    voteData.votedUsers = voteData.votedUsers.filter(id => !affectedUsers.includes(id));
    
    // 保存数据
    await writeVoteData(voteData);
    
    res.json({
      message: `删除选项成功，影响了${voteCount}票`,
      options: voteData.options,
      votes: voteData.votes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取投票历史
router.get('/votes/history', async (req, res) => {
  try {
    const history = await readVoteHistory();
    res.json({ history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '服务器错误' });
  }
});


module.exports = router;
