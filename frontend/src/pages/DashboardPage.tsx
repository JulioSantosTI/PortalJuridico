import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchDashboardKpis } from "@/api/dashboard";

const CLASSE_VARIANT = { A: "success", B: "warning", C: "muted" } as const;

export function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboardKpis"], queryFn: fetchDashboardKpis });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const totalAtivas = data.ativasPorColaborador.reduce((sum, c) => sum + c.quantidade, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral das solicitações do jurídico.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total na fila geral</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{data.totalNaFilaGeral}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Solicitações ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totalAtivas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Finalizadas (total)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{data.finalizadasTotal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Colaboradores com fila ativa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{data.ativasPorColaborador.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tempo médio de resolução por tipo</CardTitle>
        </CardHeader>
        <CardContent>
          {data.tempoMedioResolucaoPorTipo.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma solicitação finalizada ainda.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {data.tempoMedioResolucaoPorTipo.map((t) => (
                <div key={t.requestTypeId} className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">{t.nome}</p>
                  <p className="text-2xl font-semibold">
                    {t.mediaDiasUteis} <span className="text-sm font-normal text-muted-foreground">dias úteis</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    com base em {t.amostras} solicitaç{t.amostras === 1 ? "ão finalizada" : "ões finalizadas"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Solicitações ativas por colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          {data.ativasPorColaborador.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma solicitação ativa atribuída no momento.</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ativasPorColaborador}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Curva ABC de solicitantes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.curvaAbcSolicitantes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados suficientes ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>% acumulado</TableHead>
                  <TableHead>Classe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.curvaAbcSolicitantes.map((s) => (
                  <TableRow key={s.solicitanteId}>
                    <TableCell className="font-medium">{s.nome}</TableCell>
                    <TableCell>{s.quantidade}</TableCell>
                    <TableCell>{s.percentualAcumulado}%</TableCell>
                    <TableCell>
                      <Badge variant={CLASSE_VARIANT[s.classe]}>{s.classe}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
