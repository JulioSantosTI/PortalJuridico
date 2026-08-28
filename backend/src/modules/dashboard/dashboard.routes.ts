import { Router } from "express";
import { Role, RequestStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { businessDaysBetween } from "../../lib/businessDays";
import { asyncHandler } from "../../middleware/error.middleware";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/kpis",
  requireAuth,
  requireRole(Role.GESTOR),
  asyncHandler(async (_req, res) => {
    const [ativasGrouped, finalizadasTotal, solicitantesGrouped, finalizadosParaTempoMedio] = await Promise.all([
      prisma.request.groupBy({
        by: ["assignedToId"],
        where: { status: { not: RequestStatus.FINALIZADO }, assignedToId: { not: null } },
        _count: { _all: true },
      }),
      prisma.request.count({ where: { status: RequestStatus.FINALIZADO } }),
      prisma.request.groupBy({
        by: ["requesterId"],
        _count: { _all: true },
      }),
      prisma.request.findMany({
        where: { status: RequestStatus.FINALIZADO, closedAt: { not: null } },
        select: { createdAt: true, closedAt: true, requestType: { select: { id: true, name: true } } },
      }),
    ]);

    const colaboradorIds = ativasGrouped.map((g) => g.assignedToId).filter((id): id is string => !!id);
    const colaboradores = await prisma.user.findMany({
      where: { id: { in: colaboradorIds } },
      select: { id: true, name: true },
    });
    const colaboradorNome = new Map(colaboradores.map((c) => [c.id, c.name]));

    const ativasPorColaborador = ativasGrouped.map((g) => ({
      colaboradorId: g.assignedToId,
      nome: colaboradorNome.get(g.assignedToId as string) ?? "Desconhecido",
      quantidade: g._count._all,
    }));

    const solicitanteIds = solicitantesGrouped.map((g) => g.requesterId);
    const solicitantes = await prisma.user.findMany({
      where: { id: { in: solicitanteIds } },
      select: { id: true, name: true },
    });
    const solicitanteNome = new Map(solicitantes.map((s) => [s.id, s.name]));

    const totalSolicitacoes = solicitantesGrouped.reduce((sum, g) => sum + g._count._all, 0);
    const ranked = [...solicitantesGrouped].sort((a, b) => b._count._all - a._count._all);

    let acumulado = 0;
    const curvaAbcSolicitantes = ranked.map((g) => {
      acumulado += g._count._all;
      const percentualAcumulado = totalSolicitacoes === 0 ? 0 : (acumulado / totalSolicitacoes) * 100;
      const classe = percentualAcumulado <= 80 ? "A" : percentualAcumulado <= 95 ? "B" : "C";
      return {
        solicitanteId: g.requesterId,
        nome: solicitanteNome.get(g.requesterId) ?? "Desconhecido",
        quantidade: g._count._all,
        percentualAcumulado: Number(percentualAcumulado.toFixed(1)),
        classe,
      };
    });

    const tempoPorTipo = new Map<string, { nome: string; totalDiasUteis: number; amostras: number }>();
    for (const r of finalizadosParaTempoMedio) {
      const dias = businessDaysBetween(r.createdAt, r.closedAt as Date);
      const entry = tempoPorTipo.get(r.requestType.id) ?? { nome: r.requestType.name, totalDiasUteis: 0, amostras: 0 };
      entry.totalDiasUteis += dias;
      entry.amostras += 1;
      tempoPorTipo.set(r.requestType.id, entry);
    }
    const tempoMedioResolucaoPorTipo = Array.from(tempoPorTipo.entries()).map(([requestTypeId, v]) => ({
      requestTypeId,
      nome: v.nome,
      mediaDiasUteis: Number((v.totalDiasUteis / v.amostras).toFixed(1)),
      amostras: v.amostras,
    }));

    res.json({
      totalNaFilaGeral: totalSolicitacoes,
      ativasPorColaborador,
      finalizadasTotal,
      curvaAbcSolicitantes,
      tempoMedioResolucaoPorTipo,
    });
  })
);
