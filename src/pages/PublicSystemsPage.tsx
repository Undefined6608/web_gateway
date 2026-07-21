import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Alert, Button, Input, Select, Skeleton } from "antd";
import { useNavigate } from "react-router-dom";
import { Brand } from "../components/common/Brand";
import { SystemCard } from "../components/systems/SystemCard";
import { statusMeta } from "../config/systemMeta";
import { api, errorMessage } from "../services/api";
import type { GatewaySystem } from "../types/api";

export function PublicSystemsPage() {
  const navigate = useNavigate();
  const [systems, setSystems] = useState<GatewaySystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSystems(await api.systems());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(
    () =>
      systems.filter(
        (item) =>
          (status === "all" || item.lifecycle_status === status) &&
          item.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [systems, status, query],
  );
  const stats = useMemo(
    () => ({
      total: systems.length,
      normal: systems.filter((item) => item.lifecycle_status === "normal")
        .length,
      attention: systems.filter(
        (item) =>
          item.lifecycle_status === "maintenance" ||
          item.lifecycle_status === "closed",
      ).length,
    }),
    [systems],
  );
  const onCheck = async (systemId: number, endpointId: number) => {
    const endpoint = await api.checkEndpoint(endpointId);
    setSystems((items) =>
      items.map((system) =>
        system.id === systemId
          ? {
              ...system,
              endpoints: system.endpoints.map((item) =>
                item.id === endpointId ? endpoint : item,
              ),
            }
          : system,
      ),
    );
  };

  return (
    <div className="public-shell">
      <header className="public-header">
        <Brand />
        <div className="public-actions">
          <span className="live-indicator">
            <i />
            服务目录
          </span>
          <Button icon={<SettingOutlined />} onClick={() => navigate("/login")}>
            管理入口
          </Button>
        </div>
      </header>
      <main className="public-main">
        <section className="directory-heading">
          <div className="directory-intro">
            <span className="section-kicker">INTEGRATION DIRECTORY</span>
            <h1>系统服务目录</h1>
            <p>查找系统入口、检测访问状态，确认当前维护负责人。</p>
          </div>
          <div className="directory-stats" aria-label="目录统计">
            <div>
              <strong>{stats.total}</strong>
              <span>已接入系统</span>
            </div>
            <div>
              <strong>{stats.normal}</strong>
              <span>运行正常</span>
            </div>
            <div className={stats.attention ? "has-attention" : ""}>
              <strong>{stats.attention}</strong>
              <span>需要关注</span>
            </div>
          </div>
        </section>
        <section className="directory-controls">
          <div className="toolbar">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="按系统名称搜索"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Select
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "全部状态" },
                ...Object.entries(statusMeta).map(([value, item]) => ({
                  value,
                  label: item.label,
                })),
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={load}>
              刷新目录
            </Button>
          </div>
          <span className="result-count">显示 {visible.length} 个系统</span>
        </section>
        {error && (
          <Alert
            type="error"
            showIcon
            message="无法获取系统目录"
            description={error}
            action={
              <Button size="small" onClick={load}>
                重试
              </Button>
            }
          />
        )}
        {loading ? (
          <div className="skeleton-stack">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} active paragraph={{ rows: 4 }} />
            ))}
          </div>
        ) : visible.length ? (
          <div className="system-grid">
            {visible.map((system, index) => (
              <SystemCard
                key={system.id}
                system={system}
                index={index}
                onCheck={onCheck}
              />
            ))}
          </div>
        ) : (
          <div className="empty-directory">
            <div className="empty-icon">
              <SearchOutlined />
            </div>
            <strong>
              {query || status !== "all"
                ? "没有符合条件的系统"
                : "系统目录尚未配置"}
            </strong>
            <span>
              {query || status !== "all"
                ? "试试更换关键词或状态筛选。"
                : "系统接入后会在这里显示访问地址和最近检测结果。"}
            </span>
            {(query || status !== "all") && (
              <Button
                type="link"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                }}
              >
                清除筛选
              </Button>
            )}
          </div>
        )}
      </main>
      <footer className="public-footer">
        <span>系统集成网关</span>
        <span>状态数据以最近一次检测结果为准</span>
      </footer>
    </div>
  );
}
