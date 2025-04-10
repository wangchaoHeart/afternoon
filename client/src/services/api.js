import { request } from 'umi';

const BASE_URL = '/api';

// 获取投票历史
export async function getVoteHistory() {
  return request(`${BASE_URL}/votes/history`, {
    method: 'GET',
    credentials: 'include',
  });
}