import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Form, Input, Select, Space, notification } from "antd";
import api from "../api";

export default function Categories() {
  const [items, setItems] = useState([]);
  const [form] = Form.useForm();

  const fetchAll = useCallback(async () => {
    try {
      const { data } = await api.get("/categories");
      setItems(Array.isArray(data) ? data : []);
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      notification.error({ message: "Ошибка загрузки категорий" });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  const grouped = useMemo(() => {
    const income = items.filter((x) => x.type === "income");
    const expense = items.filter((x) => x.type === "expense");
    return { income, expense };
  }, [items]);

  const add = async () => {
    try {
      const v = await form.validateFields();
      await api.post("/categories", v);
      form.resetFields();
      fetchAll();
      notification.success({ message: "Категория добавлена" });
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      notification.error({ message: "Ошибка добавления" });
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      fetchAll();
      notification.success({ message: "Категория удалена" });
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      notification.error({ message: "Ошибка удаления" });
    }
  };

  const renderList = (arr) => (
    <Space direction="vertical" style={{ width: "100%" }}>
      {arr.map((c) => (
        <Space key={c.id} style={{ justifyContent: "space-between", width: "100%" }}>
          <span>{c.name}</span>
          <Button danger onClick={() => del(c.id)}>Удалить</Button>
        </Space>
      ))}
    </Space>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="Добавить категорию">
        <Form form={form} layout="inline">
          <Form.Item name="name" rules={[{ required: true }]}>
            <Input placeholder="Название" />
          </Form.Item>
          <Form.Item name="type" rules={[{ required: true }]}>
            <Select
              style={{ width: 160 }}
              options={[
                { label: "Доход", value: "income" },
                { label: "Расход", value: "expense" },
              ]}
              placeholder="Тип"
            />
          </Form.Item>
          <Button type="primary" onClick={add}>Добавить</Button>
        </Form>
      </Card>

      <Card title="Доходы">{renderList(grouped.income)}</Card>
      <Card title="Расходы">{renderList(grouped.expense)}</Card>
    </div>
  );
}
