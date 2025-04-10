import React, { useState, useEffect } from 'react';
import { useModel } from 'umi';
import { Card, Radio, Input, Button, List, Typography, Divider, Space, Progress, Spin, Tabs, Popconfirm, message } from 'antd';
import { DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import styles from './index.less';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

export default function IndexPage() {
  const { 
    options, 
    votes, 
    hasVoted, 
    userVote,
    loading, 
    addOption, 
    vote, 
    connectWebSocket, 
    deleteOption, 
    voteHistory, 
    fetchVoteHistory,
  } = useModel('vote');
  
  const [newOption, setNewOption] = useState('');
  const [selectedOption, setSelectedOption] = useState(userVote || '');
  const [activeTab, setActiveTab] = useState('1');
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    connectWebSocket();
  }, []);

  useEffect(() => {
    if (activeTab === '2' && (!voteHistory || voteHistory.length === 0)) {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    await fetchVoteHistory();
    setHistoryLoading(false);
  };

  const handleAddOption = () => {
    if (!newOption.trim()) {
      message.warning('选项不能为空');
      return;
    }
    addOption(newOption.trim());
    setNewOption('');
  };

  const handleVote = () => {
    if (!selectedOption) {
      message.warning('请选择一个选项');
      return;
    }
    vote(selectedOption);
  };

  const handleDeleteOption = (option) => {
    deleteOption(option);
    if (selectedOption === option) {
      setSelectedOption('');
    }
  };

  const getTotalVotes = () => {
    return Object.values(votes).reduce((sum, count) => sum + Number(count), 0);
  };

  const totalVotes = getTotalVotes();
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  const renderVotingTab = () => (
    <>
      <div className={styles.dateInfo}>
        <Text type="secondary">今日日期: {today}</Text>
      </div>
      
      {loading ? (
        <div className={styles.loading}>
          <Spin size="large" />
          <Text className={styles.loadingText}>加载中...</Text>
        </div>
      ) : hasVoted ? (
        <div className={styles.results}>
          <Title level={4}>投票结果</Title>
          <Text type="secondary">总投票数: {totalVotes}</Text>
          <List
            itemLayout="horizontal"
            dataSource={options}
            renderItem={option => (
              <List.Item>
                <List.Item.Meta
                  title={option}
                  description={
                    <Progress 
                      percent={totalVotes ? Math.round((votes[option] || 0) / totalVotes * 100) : 0} 
                      format={percent => `${votes[option] || 0} 票 (${percent}%)`}
                    />
                  }
                />
              </List.Item>
            )}
          />
          <Text type="secondary" className={styles.thankYou}>
            感谢您的参与！
          </Text>
        </div>
      ) : (
        <>
          <div className={styles.voteSection}>
            <Title level={4}>请选择您喜欢的下午茶:</Title>
            {options.length === 0 ? (
              <div className={styles.emptyOptions}>
                <Text type="secondary">今天还没有添加选项，请添加新选项。</Text>
              </div>
            ) : (
              <Radio.Group 
                onChange={e => setSelectedOption(e.target.value)} 
                value={selectedOption}
                className={styles.radioGroup}
              >
                {options.map(option => (
                  <div key={option} className={styles.optionItem}>
                    <Radio value={option} className={styles.radioOption}>
                      {option}
                    </Radio>
                    <Popconfirm
                      title="确定要删除这个选项吗？"
                      onConfirm={() => handleDeleteOption(option)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />} 
                        className={styles.deleteBtn}
                      />
                    </Popconfirm>
                  </div>
                ))}
              </Radio.Group>
            )}
            <Button 
              type="primary" 
              onClick={handleVote} 
              disabled={!selectedOption || loading || options.length === 0}
              className={styles.voteButton}
              loading={loading}
            >
              投票
            </Button>
          </div>
          
          <Divider />
          
          <div className={styles.addSection}>
            <Title level={4}>添加新选项:</Title>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={newOption}
                onChange={e => setNewOption(e.target.value)}
                placeholder="输入新选项，如：珍珠奶茶"
                onPressEnter={handleAddOption}
                disabled={loading}
              />
              <Button 
                type="primary" 
                onClick={handleAddOption}
                loading={loading}
              >
                添加
              </Button>
            </Space.Compact>
          </div>
        </>
      )}
    </>
  );

  const renderHistoryTab = () => (
    <div className={styles.historyContainer}>
      {historyLoading ? (
        <div className={styles.loading}>
          <Spin size="large" />
          <Text className={styles.loadingText}>加载历史数据中...</Text>
        </div>
      ) : voteHistory && voteHistory.length > 0 ? (
        <List
          itemLayout="vertical"
          dataSource={voteHistory}
          renderItem={item => {
            const dateStr = new Date(item.date).toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            const totalVotes = Object.values(item.votes).reduce((sum, count) => sum + Number(count), 0);
            return (
              <List.Item className={styles.historyItem}>
                <Title level={4}>{dateStr}</Title>
                <Text type="secondary">总投票数: {totalVotes}</Text>
                <List
                  size="small"
                  dataSource={item.options}
                  renderItem={option => (
                    <List.Item>
                      <List.Item.Meta
                        title={option}
                        description={
                          <Progress 
                            percent={totalVotes ? Math.round((item.votes[option] || 0) / totalVotes * 100) : 0} 
                            format={percent => `${item.votes[option] || 0} 票 (${percent}%)`}
                            size="small"
                          />
                        }
                      />
                    </List.Item>
                  )}
                />
              </List.Item>
            );
          }}
        />
      ) : (
        <div className={styles.emptyHistory}>
          <Text type="secondary">暂无历史记录</Text>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <Title level={2} className={styles.title}>下午茶投票</Title>
        
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          className={styles.tabs}
        >
          <TabPane 
            tab={<span>今日投票</span>} 
            key="1"
          >
            {renderVotingTab()}
          </TabPane>
          <TabPane 
            tab={<span><HistoryOutlined /> 历史记录</span>} 
            key="2"
          >
            {renderHistoryTab()}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}