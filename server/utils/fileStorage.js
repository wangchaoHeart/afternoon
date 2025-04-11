const fs = require('fs').promises;
const path = require('path');

const dataFilePath = path.join(__dirname, '../data/votes.json');

// 默认数据结构
const defaultData = {
  options: ['奶茶', '咖啡', '果汁', '蛋糕'],
  votes: {},
  votedUsers: []
};

// 读取投票数据
async function readVoteData() {
  try {
    // 检查文件是否存在
    await fs.access(dataFilePath);
    
    // 读取文件内容
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // 如果文件不存在或有其他错误，创建默认数据
    await writeVoteData(defaultData);
    return defaultData;
  }
}

// 写入投票数据
async function writeVoteData(data) {
  try {
    // 确保目录存在
    const dir = path.dirname(dataFilePath);
    await fs.mkdir(dir, { recursive: true });
    
    // 写入文件
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('写入数据失败:', error);
    return false;
  }
}

module.exports = {
  readVoteData,
  writeVoteData
};
