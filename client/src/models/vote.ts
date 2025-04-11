import { useState } from 'react';
import { message } from 'antd';
import { 
  getVoteData, 
  addOption as apiAddOption, 
  submitVote, 
  deleteOption as apiDeleteOption,
  getVoteHistory as apiGetVoteHistory,
} from '@/services/api';

export default () => {
  const [options, setOptions] = useState([]);
  const [votes, setVotes] = useState({});
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voteHistory, setVoteHistory] = useState([]);

  // 从后端获取数据
  const initFromServer = async () => {
    setLoading(true);
    try {
      const data = await getVoteData();
      setOptions(data.options);
      setVotes(data.votes);
      setHasVoted(data.hasVoted);
    } catch (error) {
      console.error('获取数据失败:', error);
      message.error('获取数据失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  // 添加新选项
  const addOption = async (option) => {
    setLoading(true);
    try {
      const response = await apiAddOption(option);
      setOptions(response.options);
      return true;
    } catch (error) {
      console.error('添加选项失败:', error);
      message.error(error.data?.message || '添加选项失败');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 投票
  const vote = async (option) => {
    setLoading(true);
    try {
      const response = await submitVote(option);
      setVotes(response.votes);
      setHasVoted(response.hasVoted);
      return true;
    } catch (error) {
      console.error('投票失败:', error);
      message.error(error.data?.message || '投票失败');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 删除选项
  const deleteOption = async (option) => {
    setLoading(true);
    try {
      const response = await apiDeleteOption(option);
      setOptions(response.options);
      setVotes(response.votes);
      return true;
    } catch (error) {
      console.error('删除选项失败:', error);
      message.error(error.data?.message || '删除选项失败');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 获取投票历史
  const fetchVoteHistory = async () => {
    try {
      const response = await apiGetVoteHistory();
      setVoteHistory(response.history);
      return true;
    } catch (error) {
      console.error('获取历史记录失败:', error);
      message.error(error.data?.message || '获取历史记录失败');
      return false;
    }
  };



  return {
    options,
    votes,
    hasVoted,
    loading,
    voteHistory,
    addOption,
    vote,
    initFromServer,
    deleteOption,
    fetchVoteHistory,
  };
};
