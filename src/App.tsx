import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  DollarSign,
  Settings,
  Plus,
  Trash2,
  PieChart as PieChartIcon,
  Users,
  Download,
  RefreshCw
} from 'lucide-react';

type CostItem = {
  id: string;
  name: string;
  amount: number;
  currency: 'USD' | 'BRL';
};

export default function App() {
  const [exchangeRate, setExchangeRate] = useState<number>(5.50); // BRL per USD
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(false);
  
  const [costs, setCosts] = useState<CostItem[]>([
    { id: '1', name: 'Assinatura Railway', amount: 20, currency: 'USD' },
    { id: '2', name: 'Taxas Apple Developer', amount: 20, currency: 'USD' },
    { id: '3', name: 'VPS temporária Hostinger', amount: 109.99, currency: 'BRL' },
  ]);
  
  const [calcMode, setCalcMode] = useState<'users' | 'percentage'>('percentage');
  const [targetUsers, setTargetUsers] = useState<number>(50);
  const [targetPercentage, setTargetPercentage] = useState<number>(8);

  const fetchExchangeRate = async () => {
    setIsLoadingRate(true);
    try {
      const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
      const data = await response.json();
      if (data && data.USDBRL && data.USDBRL.ask) {
        setExchangeRate(Number(parseFloat(data.USDBRL.ask).toFixed(2)));
      }
    } catch (error) {
      console.error('Erro ao buscar cotação:', error);
    } finally {
      setIsLoadingRate(false);
    }
  };

  // Buscar a cotação assim que o app carregar
  useEffect(() => {
    fetchExchangeRate();
  }, []);

  const addCost = () => {
    setCosts([
      ...costs,
      { id: Date.now().toString(), name: 'Novo Custo', amount: 0, currency: 'BRL' }
    ]);
  };

  const updateCost = (id: string, field: keyof CostItem, value: any) => {
    setCosts(costs.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCost = (id: string) => {
    setCosts(costs.filter(c => c.id !== id));
  };

  const totalCostsBRL = useMemo(() => {
    return costs.reduce((acc, cost) => {
      if (cost.currency === 'USD') {
        return acc + (cost.amount * exchangeRate);
      }
      return acc + cost.amount;
    }, 0);
  }, [costs, exchangeRate]);

  const costPerUser = useMemo(() => {
    if (calcMode === 'users') {
      return targetUsers > 0 ? totalCostsBRL / targetUsers : 0;
    } else {
      return totalCostsBRL * (targetPercentage / 100);
    }
  }, [calcMode, targetUsers, targetPercentage, totalCostsBRL]);

  const formatCurrency = (value: number, currency: 'BRL' | 'USD' = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const exportToExcelNative = () => {
    const formatNum = (n: number) => n.toFixed(2).replace('.', ',');

    // Criação de uma tabela HTML formatada especificamente para o Excel ler
    let tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: middle; }
          .title { background-color: #4f46e5; color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; }
          .section { background-color: #f1f5f9; font-weight: bold; color: #334155; }
          .header { background-color: #e2e8f0; font-weight: bold; color: #0f172a; }
          .total { font-weight: bold; background-color: #f8fafc; }
          .currency-brl { mso-number-format:"\\R\\$\\ \\#\\,\\#\\#0\\.00"; }
          .currency-usd { mso-number-format:"\\U\\S\\$\\ \\#\\,\\#\\#0\\.00"; }
          .percent { mso-number-format:"0\\.00%"; }
          .text { mso-number-format:"\\@"; }
        </style>
      </head>
      <body>
        <table>
          <colgroup>
            <col width="250">
            <col width="100">
            <col width="150">
            <col width="150">
            <col width="150">
          </colgroup>
          <tr><td colspan="5" class="title">📊 RELATÓRIO DETALHADO DE CUSTOS</td></tr>
          <tr><td colspan="5"></td></tr>
          
          <tr class="section"><td colspan="5">INFORMAÇÕES GERAIS</td></tr>
          <tr>
            <td class="text">Data da Análise</td>
            <td colspan="4" class="text">${new Date().toLocaleDateString('pt-BR')}</td>
          </tr>
          <tr>
            <td class="text">Cotação USD/BRL</td>
            <td colspan="4" class="currency-brl" x:num="${exchangeRate}">${formatNum(exchangeRate)}</td>
          </tr>
          <tr><td colspan="5"></td></tr>

          <tr class="section"><td colspan="5">DETALHAMENTO DE CUSTOS FIXOS</td></tr>
          <tr class="header">
            <td>Nome do Custo</td>
            <td>Moeda</td>
            <td>Valor Original</td>
            <td>Valor Convertido (R$)</td>
            <td>Representatividade (%)</td>
          </tr>
    `;

    costs.forEach(c => {
      const converted = c.currency === 'USD' ? c.amount * exchangeRate : c.amount;
      const percentage = totalCostsBRL > 0 ? (converted / totalCostsBRL) : 0;
      const currencyClass = c.currency === 'USD' ? 'currency-usd' : 'currency-brl';
      
      tableHTML += `
        <tr>
          <td class="text">${c.name}</td>
          <td class="text">${c.currency}</td>
          <td class="${currencyClass}" x:num="${c.amount}">${formatNum(c.amount)}</td>
          <td class="currency-brl" x:num="${converted}">${formatNum(converted)}</td>
          <td class="percent" x:num="${percentage}">${(percentage * 100).toFixed(2).replace('.', ',')}%</td>
        </tr>
      `;
    });

    tableHTML += `
          <tr class="total">
            <td colspan="3" style="text-align: right;">TOTAL MENSAL:</td>
            <td class="currency-brl" x:num="${totalCostsBRL}">${formatNum(totalCostsBRL)}</td>
            <td class="percent" x:num="1">100,00%</td>
          </tr>
          <tr><td colspan="5"></td></tr>

          <tr class="section"><td colspan="5">MÉTRICAS DE RATEIO</td></tr>
    `;

    if (calcMode === 'users') {
      tableHTML += `
          <tr>
            <td class="text">Modo de Rateio</td>
            <td colspan="4" class="text">Por Quantidade de Usuários</td>
          </tr>
          <tr>
            <td class="text">Meta de Usuários</td>
            <td colspan="4" x:num="${targetUsers}">${targetUsers}</td>
          </tr>
      `;
    } else {
      tableHTML += `
          <tr>
            <td class="text">Modo de Rateio</td>
            <td colspan="4" class="text">Por Porcentagem do Custo</td>
          </tr>
          <tr>
            <td class="text">Porcentagem por Usuário</td>
            <td colspan="4" class="percent" x:num="${targetPercentage / 100}">${formatNum(targetPercentage)}%</td>
          </tr>
      `;
    }

    tableHTML += `
          <tr class="total">
            <td class="text">Custo por Usuário (R$)</td>
            <td colspan="4" class="currency-brl" x:num="${costPerUser}">${formatNum(costPerUser)}</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Cria o blob com o tipo MIME do Excel antigo para forçar a leitura do HTML
    const blob = new Blob(['\uFEFF' + tableHTML], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'levantamento-custos.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-indigo-600" />
              Levantamento de Custos
            </h1>
            <p className="text-slate-500 mt-1">
              Analise seus custos de infraestrutura e o custo por usuário.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <DollarSign className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cotação USD/BRL</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-slate-700">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    className="w-20 bg-transparent font-semibold text-slate-900 focus:outline-none focus:ring-0 p-0"
                  />
                  <button 
                    onClick={fetchExchangeRate} 
                    disabled={isLoadingRate}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                    title="Atualizar cotação atual"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingRate ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={exportToExcelNative}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-medium transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar Planilha</span>
            </button>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <PieChartIcon className="w-16 h-16 text-indigo-600" />
            </div>
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Custo Total Mensal</h3>
            <p className="text-4xl font-bold text-slate-900">{formatCurrency(totalCostsBRL)}</p>
            <p className="text-sm text-slate-500 mt-2">
              Baseado na cotação de R$ {exchangeRate.toFixed(2)}
            </p>
          </div>
          
          <div className="bg-indigo-600 p-6 rounded-2xl shadow-md relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Users className="w-16 h-16 text-white" />
            </div>
            <div className="flex justify-between items-start mb-1 relative z-10">
              <h3 className="text-sm font-medium text-indigo-200 uppercase tracking-wider">Custo por Usuário</h3>
              <select 
                value={calcMode} 
                onChange={(e) => setCalcMode(e.target.value as 'users' | 'percentage')}
                className="bg-indigo-700 text-xs text-indigo-100 border border-indigo-500 rounded p-1 focus:outline-none focus:border-indigo-300 cursor-pointer"
              >
                <option value="percentage">% do Custo</option>
                <option value="users">Qtd. Usuários</option>
              </select>
            </div>
            <div className="flex items-baseline gap-2 relative z-10">
              <p className="text-4xl font-bold">{formatCurrency(costPerUser)}</p>
              <p className="text-indigo-200 font-medium">/ usuário</p>
            </div>
            <div className="mt-4 flex items-center gap-2 relative z-10">
              {calcMode === 'users' ? (
                <>
                  <span className="text-sm text-indigo-100">Meta de usuários:</span>
                  <input
                    type="number"
                    min="1"
                    value={targetUsers}
                    onChange={(e) => setTargetUsers(Number(e.target.value))}
                    className="w-20 bg-indigo-700/50 border border-indigo-500 text-white text-sm rounded-md px-2 py-1 focus:outline-none focus:border-indigo-300"
                  />
                </>
              ) : (
                <>
                  <span className="text-sm text-indigo-100">Porcentagem cobrada:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={targetPercentage}
                      onChange={(e) => setTargetPercentage(Number(e.target.value))}
                      className="w-20 bg-indigo-700/50 border border-indigo-500 text-white text-sm rounded-md px-2 py-1 focus:outline-none focus:border-indigo-300"
                    />
                    <span className="text-indigo-100">%</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Costs Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-400" />
              Detalhamento de Custos
            </h2>
            <button
              onClick={addCost}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Adicionar Custo
            </button>
          </div>
          
          <div className="space-y-3">
            {costs.map((cost) => {
              const convertedValue = cost.currency === 'USD' ? cost.amount * exchangeRate : cost.amount;
              const percentage = totalCostsBRL > 0 ? (convertedValue / totalCostsBRL) * 100 : 0;
              
              return (
                <div key={cost.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={cost.name}
                      onChange={(e) => updateCost(cost.id, 'name', e.target.value)}
                      className="w-full bg-transparent text-base font-medium text-slate-700 focus:outline-none"
                      placeholder="Nome do custo"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={cost.currency}
                        onChange={(e) => updateCost(cost.id, 'currency', e.target.value)}
                        className="bg-white border border-slate-200 text-sm rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-300"
                      >
                        <option value="BRL">BRL</option>
                        <option value="USD">USD</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={cost.amount}
                        onChange={(e) => updateCost(cost.id, 'amount', Number(e.target.value))}
                        className="w-24 bg-white border border-slate-200 text-sm rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-300"
                      />
                    </div>
                    
                    <div className="w-24 text-right">
                      <span className="text-sm font-semibold text-slate-700">
                        {formatCurrency(convertedValue)}
                      </span>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {percentage.toFixed(1)}% do total
                      </div>
                    </div>

                    <button
                      onClick={() => removeCost(cost.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                      title="Remover custo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
