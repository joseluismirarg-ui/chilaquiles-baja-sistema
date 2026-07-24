'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0C447C', '#3B6D11', '#A32D2D', '#DC3545', '#FFC107', '#17A2B8'];

function formatoMoneda(value: any): string {
  const num = Number(value);
  return `$${isNaN(num) ? 0 : num.toLocaleString()}`;
}

function formatoPorcentaje(value: any): string {
  const num = Number(value);
  return `${isNaN(num) ? '0.0' : num.toFixed(1)}%`;
}

export function VentasChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="fecha" />
        <YAxis />
        <Tooltip formatter={formatoMoneda} />
        <Legend />
        <Line
          type="monotone"
          dataKey="ventas"
          stroke="#3B6D11"
          strokeWidth={2}
          name="Ventas"
        />
        <Line
          type="monotone"
          dataKey="gastos"
          stroke="#A32D2D"
          strokeWidth={2}
          name="Gastos"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function IngresosGastosChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="periodo" />
        <YAxis />
        <Tooltip formatter={formatoMoneda} />
        <Legend />
        <Bar dataKey="ingresos" fill="#3B6D11" name="Ingresos" />
        <Bar dataKey="gastos" fill="#A32D2D" name="Gastos" />
        <Bar dataKey="utilidad" fill="#0C447C" name="Utilidad" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GastosPorCategoriaChart({
  data,
}: {
  data: Array<{ nombre: string; valor: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(props: any) => `${props.nombre}: $${Number(props.valor).toLocaleString()}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="valor"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={formatoMoneda} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MargenChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="fecha" />
        <YAxis />
        <Tooltip formatter={formatoPorcentaje} />
        <Legend />
        <Line
          type="monotone"
          dataKey="margen"
          stroke="#0C447C"
          strokeWidth={2}
          name="Margen %"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ComisionesChart({
  data,
}: {
  data: Array<{ plataforma: string; comision: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="plataforma" type="category" />
        <Tooltip formatter={formatoPorcentaje} />
        <Bar dataKey="comision" fill="#DC3545" name="Comisión %" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopInsumosChart({
  data,
}: {
  data: Array<{ insumo: string; monto: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="insumo" type="category" width={100} />
        <Tooltip formatter={formatoMoneda} />
        <Bar dataKey="monto" fill="#FFC107" name="Monto" />
      </BarChart>
    </ResponsiveContainer>
  );
}
