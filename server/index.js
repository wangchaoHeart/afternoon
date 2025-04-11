const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const apiRoutes = require('./routes/api');

// 初始化 Express 应用
const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors({
  origin: 'http://localhost:8000', // UmiJS 默认端口
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const distDir = path.join(__dirname, './dist'); // 假设 dist 文件夹在项目根目录
app.use(express.static(distDir)); // 提供静态文件服务

// 路由
app.use('/api', apiRoutes);

// 处理前端路由：将所有未匹配的路由指向 index.html
app.get('*', (req, res) => {
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath); // 返回前端的 index.html
  } else {
    res.status(404).send('前端构建文件未找到，请先构建前端项目');
  }
});
// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
