import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  notification,
} from "antd";
import api from "../api";

const { RangePicker } = DatePicker;

export default function Transactions() {
  // --- данные таблицы
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  // --- пагинация (берём из ответа, но храним и локально)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // --- справочники
  const [categories, setCategories] = useState([]);

  // --- фильтры (то, что ты перечислил: from, to, categoryId, type, q)
  const [range, setRange] = useState(null); // [dayjs, dayjs] | null
  const [categoryId, setCategoryId] = useState(null);
  const [type, setType] = useState(null); // "income" | "expense" | null
  const [q, setQ] = useState("");

  // --- модалка добавления
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  // categories: быстрый поиск по id
  const categoriesById = useMemo(() => {
    const m = new Map();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ label: `${c.name} (${c.type})`, value: c.id })),
    [categories]
  );

  const buildParams = ({ omitPagination = false } = {}) => {
    const params = {};
    if (!omitPagination) {
      params.page = page;
      params.limit = limit;
    }
    if (range?.[0]) params.from = range[0].startOf("day").toDate().toISOString();
    if (range?.[1]) params.to = range[1].endOf("day").toDate().toISOString();
    if (categoryId) params.categoryId = categoryId;
    if (type) params.type = type;
    if (q?.trim()) params.q = q.trim();
    return params;
  };

  const fetchCategories = async () => {
    const { data } = await api.get("/categories");
    setCategories(Array.isArray(data) ? data : []);
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/transactions", { params: buildParams() });

      // твой контракт: { items, total, page, limit }
      setRows(data.items || []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? 1);
      setLimit(data.limit ?? 10);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Важно: перезапрос при изменении пагинации И фильтров
  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, range, categoryId, type, q]);

  const getRowCategoryId = (row) => row.categoryId ?? row.category_id ?? row.categoryID;

  const getTxType = (row) => {
    // если backend уже отдаёт type/category_type — используем
    const direct = row.type || row.category_type;
    if (direct) return direct;

    // иначе определяем через categoriesById
    const cid = getRowCategoryId(row);
    return cid ? categoriesById.get(cid)?.type : undefined;
  };

  const onAdd = async () => {
    const values = await form.validateFields();

    const payload = {
      categoryId: values.categoryId,
      amount: Number(values.amount), // всегда положительный
      date: values.date.toDate().toISOString(), // ISO
      comment: values.comment || "",
    };

    await api.post("/transactions", payload);
    notification.success({ message: "Транзакция добавлена" });

    setModalOpen(false);
    form.resetFields();

    // после добавления обычно логично вернуться на первую страницу списка
    setPage(1);
  };

  const onDelete = async (id) => {
    await api.delete(`/transactions/${id}`);
    notification.success({ message: "Транзакция удалена" });
    // просто перезапросим текущую страницу/фильтры
    fetchTransactions();
  };

  const exportCsv = async () => {
    const res = await api.get("/transactions/export", {
      responseType: "blob",
      // если бэкенд поддерживает фильтры для экспорта — они уйдут;
      // если нет — он их проигнорирует (но лишними не будут).
      params: buildParams({ omitPagination: true }),
    });

    const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  };

  const columns = [
    {
      title: "Дата",
      dataIndex: "date",
      render: (v) => (v ? new Date(v).toLocaleString() : ""),
    },
    {
      title: "Категория",
      render: (_, row) => {
        const name = row.category_name || row.categoryName || "—";
        const txType = getTxType(row);
        const color = txType === "income" ? "green" : txType === "expense" ? "red" : "default";
        return <Tag color={color}>{name}</Tag>;
      },
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      render: (v, row) => {
        const txType = getTxType(row);
        const color = txType === "income" ? "#52c41a" : "#ff4d4f";

        // Т.к. amount всегда положительный, для читаемости можно показывать знак
        const sign = txType === "expense" ? "−" : "+";
        return <span style={{ color }}>{`${sign}${Number(v)}`}</span>;
      },
    },
    { title: "Комментарий", dataIndex: "comment" },
    {
      title: "Действия",
      dataIndex: "id",
      render: (id) => (
        <Button danger onClick={() => onDelete(id)}>
          Удалить
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ФИЛЬТРЫ */}
      <Space wrap>
        <RangePicker
          value={range}
          onChange={(v) => {
            setRange(v);
            setPage(1);
          }}
        />

        <Select
          allowClear
          placeholder="Категория"
          style={{ width: 240 }}
          options={categoryOptions}
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v ?? null);
            setPage(1);
          }}
        />

        <Select
          allowClear
          placeholder="Тип"
          style={{ width: 160 }}
          options={[
            { label: "income", value: "income" },
            { label: "expense", value: "expense" },
          ]}
          value={type}
          onChange={(v) => {
            setType(v ?? null);
            setPage(1);
          }}
        />

        <Input.Search
          placeholder="Поиск (q)"
          allowClear
          style={{ width: 260 }}
          onSearch={(value) => {
            setQ(value);
            setPage(1);
          }}
        />

        <Button
          onClick={() => {
            setRange(null);
            setCategoryId(null);
            setType(null);
            setQ("");
            setPage(1);
          }}
        >
          Сбросить фильтры
        </Button>
      </Space>

      {/* КНОПКИ */}
      <Space wrap>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          Добавить транзакцию
        </Button>
        <Button onClick={exportCsv}>Export CSV</Button>
      </Space>

      {/* ТАБЛИЦА */}
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          onChange: (p, ps) => {
            setPage(p);
            setLimit(ps);
          },
        }}
      />

      {/* МОДАЛКА */}
      <Modal
        title="Новая транзакция"
        open={modalOpen}
        onOk={onAdd}
        onCancel={() => setModalOpen(false)}
        okText="Создать"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Категория" name="categoryId" rules={[{ required: true }]}>
            <Select options={categoryOptions} placeholder="Выберите категорию" />
          </Form.Item>

          <Form.Item
            label="Сумма (всегда положительная)"
            name="amount"
            rules={[{ required: true, type: "number", min: 0.01 }]}
          >
            <InputNumber min={0.01} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Дата и время" name="date" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Комментарий" name="comment">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
