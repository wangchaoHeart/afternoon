import { useState, useEffect } from 'react';
import { message } from 'antd';
import { getVoteHistory } from '@/services/api';

export default () => {
  const [options, setOptions] = useState([]);
  const [votes, setVotes] = useState({});
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null); // 包含投票人详细信息
  const [loading, setLoading] = useState(true);
  const [voteHistory, setVoteHistory] = useState([]);
  const [ws, setWs] = useState(null);

  const connectWebSocket = () => {
    const websocket = new WebSocket(`ws://${window.location.host}`);
    setWs(websocket);

    websocket.onopen = () => {
      console.log('WebSocket 连接已建立');
      setLoading(false);
    };

    websocket.onmessage = (event) => {
      const { type, data, message: errorMessage } = JSON.parse(event.data);
      console.log('收到 WebSocket 消息:', { type, data });
      switch (type) {
        case 'init':
          setOptions(data.options);
          setVotes(data.votes);
          setHasVoted(data.hasVoted);
          setUserVote(data.userVote); // 存储完整的 userVote 对象
          break;
        case 'voteUpdate':
          setOptions(data.options);
          setVotes(data.votes);
          if (data.hasVoted !== undefined) {
            setHasVoted(data.hasVoted);
            setUserVote(data.userVote); // 更新投票人信息
          }
          break;
        case 'error':
          message.error(errorMessage);
          break;
        default:
          console.warn('未知消息类型:', type);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket 错误:', error);
      message.error('连接服务器失败');
      setLoading(false);
    };

    websocket.onclose = () => {
      console.log('WebSocket 连接已关闭');
      setLoading(false);
    };
  };

  const addOption = (option) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'addOption', data: { option } }));
    } else {
      message.error('未连接到服务器');
    }
  };

  const vote = (option) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'vote', data: { option } }));
    } else {
      message.error('未连接到服务器');
    }
  };

  const deleteOption = (option) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'deleteOption', data: { option } }));
    } else {
      message.error('未连接到服务器');
    }
  };

  const fetchVoteHistory = async () => {
    try {
      const response = await getVoteHistory();
      setVoteHistory(response.history);
      return true;
    } catch (error) {
      console.error('获取历史记录失败:', error);
      message.error(error.data?.message || '获取历史记录失败');
      return false;
    }
  };

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  return {
    options,
    votes,
    hasVoted,
    userVote,
    loading,
    voteHistory,
    addOption,
    vote,
    connectWebSocket,
    deleteOption,
    fetchVoteHistory,
  };
};