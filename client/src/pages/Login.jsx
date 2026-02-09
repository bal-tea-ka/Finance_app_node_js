import React, { useState } from "react";
import { Card, Form, Input, Button, Typography } from "antd";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      await login(values);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "#f5f5f5",
      }}
    >
      <Card title="Вход" style={{ width: 360 }}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true }, { type: "email" }]}
          >
            <Input autoComplete="email" />
          </Form.Item>

          <Form.Item
            label="Пароль"
            name="password"
            rules={[{ required: true, min: 6 }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block>
            Войти
          </Button>

          <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
            Нет аккаунта? <Link to="/register">Регистрация</Link>
          </Typography.Paragraph>
        </Form>
      </Card>
    </div>
  );
}