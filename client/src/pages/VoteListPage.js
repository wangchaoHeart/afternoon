import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Spin, message, DatePicker, Button, Space } from 'antd';
import { getVotersInfo } from '@/services/api';
import moment from 'moment';
import styles from './index.less';

const { Title, Text } = Typography;

export default function VoteListPage() {
  const [voters, setVoters] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [filterDate, setFilterDate] = useState(null);

  useEffect(() => {
    fetchVotersInfo();
  }, [pagination.current, pagination.pageSize, filterDate]);

  const fetchVotersInfo = async () => {
    try {
      setLoading(true);
      const response = await getVotersInfo({
        page: pagination.current,
        pageSize: pagination.pageSize,
        date: filterDate ? filterDate.format('YYYY-MM-DD') : null,
      });
      setVoters(response.voters);
      setTotal(response.total);
    } catch (error) {
      console.error('获取投票者信息失败:', error);
      message.error('获取投票者信息失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  const handleDateChange = (date) => {
    setFilterDate(date);
    setPagination({ ...pagination, current: 1 }); // 重置到第一页
  };

  const handleResetFilter = () => {
    setFilterDate(null);
    setPagination({ ...pagination, current: 1 });
  };

  const columns = [
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      ellipsis: true,
    },
    {
      title: '投票日期',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => new Date(b.date) - new Date(a.date),
      render: text => new Date(text).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
    },
    {
      title: '投票选项',
      dataIndex: 'option',
      key: 'option',
    },
    {
      title: 'IP 地址',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: '投票时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      render: text => new Date(text).toLocaleString(),
    },
    {
      title: '浏览器',
      dataIndex: 'browser',
      key: 'browser',
    },
    {
      title: '操作系统',
      dataIndex: 'os',
      key: 'os',
    },
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device',
    },
    {
      title: 'User-Agent',
      dataIndex: 'ua',
      key: 'ua',
      ellipsis: true,
    },
  ];

  return (
    <div style={{padding: '20px'}}>
      <Card className={styles.card}>
        <Title level={2} className={styles.title}>投票者列表</Title>
        <Space style={{ marginBottom: 16 }}>
          <Text>按日期过滤：</Text>
          <DatePicker
            value={filterDate}
            onChange={handleDateChange}
            format="YYYY-MM-DD"
            placeholder="选择日期"
          />
          <Button onClick={handleResetFilter}>重置过滤</Button>
        </Space>
        {loading ? (
          <div className={styles.loading}>
            <Spin size="large" />
            <Text className={styles.loadingText}>加载中...</Text>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={voters}
            rowKey="userId"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: total => `共 ${total} 条记录`,
            }}
            onChange={handleTableChange}
            scroll={{ x: 1500 }}
          />
        )}
      </Card>
    </div>
  );
}