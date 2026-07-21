import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CloudServerOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import {
  Button,
  Empty,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
} from "antd";
import type { TableProps } from "antd";
import { PageFrame } from "../../components/common/PageFrame";
import { SystemDetailDrawer } from "../../components/admin/SystemDetailDrawer";
import { DataTransferActions } from "../../components/admin/DataTransferActions";
import { SystemEditor } from "../../components/admin/SystemEditor";
import { statusMeta } from "../../config/systemMeta";
import { api, errorMessage } from "../../services/api";
import type { GatewaySystem, LifecycleStatus, Person } from "../../types/api";

export function SystemsAdminPage() {
  const [systems, setSystems] = useState<GatewaySystem[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<GatewaySystem | null | undefined>(
    undefined,
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [systemItems, personItems] = await Promise.all([
        api.systems(true),
        api.people(),
      ]);
      setSystems(systemItems);
      setPeople(personItems);
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const selected = systems.find((system) => system.id === selectedId) || null;
  const visible = useMemo(
    () =>
      systems.filter((system) =>
        system.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query, systems],
  );
  const remove = async (id: number) => {
    try {
      await api.deleteSystem(id);
      message.success("系统已删除");
      void load();
    } catch (error) {
      message.error(errorMessage(error));
    }
  };
  const columns: TableProps<GatewaySystem>["columns"] = [
    {
      title: "系统",
      dataIndex: "name",
      render: (name, row) => (
        <div className="system-cell">
          <span className="table-system-icon">
            <CloudServerOutlined />
          </span>
          <span>
            <strong>{name}</strong>
            <small>{row.description || "暂无说明"}</small>
          </span>
        </div>
      ),
    },
    {
      title: "状态",
      dataIndex: "lifecycle_status",
      width: 100,
      render: (value) => (
        <Tag color={statusMeta[value as LifecycleStatus].color}>
          {statusMeta[value as LifecycleStatus].label}
        </Tag>
      ),
    },
    {
      title: "负责人",
      width: 120,
      render: (_, row) =>
        row.owner?.name || <span className="muted">未配置</span>,
    },
    {
      title: "网络",
      width: 230,
      render: (_, row) => row.endpoints.length ? `${row.endpoints.filter(endpoint => endpoint.requires_vpn).length} VPN / ${row.endpoints.filter(endpoint => endpoint.is_internal_network).length} 内网 / ${row.endpoints.filter(endpoint => endpoint.is_public_network).length} 公网` : <span className="muted">无地址</span>,
    },
    {
      title: "地址",
      width: 90,
      render: (_, row) => `${row.endpoints.length} 个`,
    },
    {
      title: "操作",
      width: 148,
      render: (_, row) => (
        <Space>
          <Tooltip title="系统配置">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setSelectedId(row.id)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => setEditing(row)}
            />
          </Tooltip>
          <Popconfirm
            title="删除系统？"
            description="地址、账号与人员关系也会一并删除。"
            onConfirm={() => remove(row.id)}
          >
            <Tooltip title="删除">
              <Button danger type="text" icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageFrame
      title="系统管理"
      description="维护接入系统、服务地址和角色配置"
      action={
        <div className="system-page-actions">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setEditing(null)}
          >
            新增系统
          </Button>
          <DataTransferActions onImported={load} />
        </div>
      }
    >
      <div className="content-panel">
        <div className="panel-toolbar">
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索系统"
            allowClear
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span>{visible.length} 个系统</span>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={visible}
          columns={columns}
          pagination={false}
          scroll={{ x: 860 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无系统"
              />
            ),
          }}
        />
      </div>
      <SystemEditor
        open={editing !== undefined}
        system={editing || null}
        people={people}
        onClose={() => setEditing(undefined)}
        onSaved={load}
      />
      <SystemDetailDrawer
        open={!!selected}
        system={selected}
        people={people}
        onClose={() => setSelectedId(null)}
        onChanged={load}
      />
    </PageFrame>
  );
}
