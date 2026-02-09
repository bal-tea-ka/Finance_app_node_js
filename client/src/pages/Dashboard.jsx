import React, { useEffect, useMemo, useState } from "react";
import { Card, Col, Row, Spin } from "antd";
import api from "../api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#ff4d4f", "#faad14", "#52c41a", "#1890ff", "#722ed1", "#13c2c2"];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [daily, setDaily] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [s, d, c] = await Promise.all([
          api.get("/analytics/summary"),
          api.get("/analytics/daily"),
          api.get("/analytics/categories"),
        ]);
        if (!mounted) return;
        setSummary(s.data);
        setDaily(Array.isArray(d.data) ? d.data : []);
        setCategories(Array.isArray(c.data) ? c.data : []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const balanceColor = useMemo(() => (summary.balance >= 0 ? "#52c41a" : "#ff4d4f"), [summary.balance]);

  if (loading) return <Spin />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Баланс">
            <div style={{ fontSize: 24, fontWeight: 600, color: balanceColor }}>
              {summary.balance}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Доход">
            <div style={{ fontSize: 24, fontWeight: 600, color: "#52c41a" }}>
              {summary.income}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Расход">
            <div style={{ fontSize: 24, fontWeight: 600, color: "#ff4d4f" }}>
              {summary.expense}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Доход vs Расход (по дням)">
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#52c41a" />
                  <Line type="monotone" dataKey="expense" stroke="#ff4d4f" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Расходы по категориям">
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} dataKey="total" nameKey="name" outerRadius={110} label>
                    {categories.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}