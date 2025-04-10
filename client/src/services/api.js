import { request } from 'umi';

const BASE_URL = '/api';

// 获取投票历史
export async function getVoteHistory() {
  return request(`${BASE_URL}/votes/history`, {
    method: 'GET',
    credentials: 'include',
  });
}
// 获取投票者信息（支持分页和日期过滤）
export async function getVotersInfo({ page = 1, pageSize = 10, date = null }) {
  const params = { page, pageSize };
  if (date) params.date = date; // 只在有日期时添加参数
  return request(`${BASE_URL}/voters`, {
    method: 'GET',
    credentials: 'include',
    params,
  });
}