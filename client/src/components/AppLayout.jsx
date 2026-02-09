import React, { useMemo } from "react";
import { Layout, Menu, Button, Typography } from "antd";
import {
  DashboardOutlined,
  SwapOutlined,
  TagsOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/transactions")) return "transactions";
    if (p.startsWith("/categories")) return "categories";
    return "dashboard";
  }, [location.pathname]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ height: 48, margin: 16, color: "#fff" }}>
          Finance Tracker
        </div>

        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]}>
          <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
            <Link to="/">Dashboard</Link>
          </Menu.Item>
          <Menu.Item key="transactions" icon={<SwapOutlined />}>
            <Link to="/transactions">Transactions</Link>
          </Menu.Item>
          <Menu.Item key="categories" icon={<TagsOutlined />}>
            <Link to="/categories">Categories</Link>
          </Menu.Item>
        </Menu>
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Typography.Text type="secondary">
            {user?.email ? `Вы вошли как: ${user.email}` : ""}
          </Typography.Text>

          <Button
            icon={<LogoutOutlined />}
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Выйти
          </Button>
        </Header>

        <Content style={{ margin: 16 }}>
          <div style={{ padding: 16, background: "#fff", borderRadius: 8 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}