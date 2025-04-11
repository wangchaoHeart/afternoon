import { request } from 'umi';

const BASE_URL = 'api';

// 获取投票数据
export async function getVoteData() {
  return request(`${BASE_URL}/votes`, {
    method: 'GET',
    credentials: 'include', // 包含 cookies
  });
}

// 添加新选项
export async function addOption(option) {
  return request(`${BASE_URL}/options`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    data: { option },
  });
}

// 投票
export async function submitVote(option) {
  return request(`${BASE_URL}/vote`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    data: { option },
  });
}

// 删除选项
export async function deleteOption(option) {
  return request(`${BASE_URL}/options/delete`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    data: { option },
  });
}
// 获取投票历史
export async function getVoteHistory() {
  return request(`${BASE_URL}/votes/history`, {
    method: 'GET',
    credentials: 'include',
  });
}