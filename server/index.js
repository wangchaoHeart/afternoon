const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const http = require('http'); // 添加 http 模块
const voteSystem = require('./routes/api'); // 修改为新的导出名称

// 初始化 Express 应用
const app = express();
const PORT = process.env.PORT || 8080;

// 创建 HTTP 服务器
const server = http.createServer(app);

// 中间件
app.use(express.json());
app.use(cookieParser());

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 提供静态文件服务
const distDir = path.join(__dirname, './dist');
app.use(express.static(distDir));

// 路由
app.use('/api', voteSystem.router); // 使用 voteSystem.router

// 设置 WebSocket
voteSystem.setupWebSocket(server); // 初始化 WebSocket

// 处理前端路由：将所有未匹配的路由指向 index.html
app.get('*', (req, res) => {
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('前端构建文件未找到，请先构建前端项目');
  }
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = app;