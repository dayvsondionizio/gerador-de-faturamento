import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import {
  FileText,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  UserCheck,
  Printer,
  Download,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { BillingFormData, MonthlyBilling } from './types';


const MONTHS_BR = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTHS_SHORT_BR = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
];

const maskCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatCurrencyInput = (value: string) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  const numberValue = Number(digits) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);
};

const parseCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return Number(digits) / 100;
};

const INITIAL_DATA: BillingFormData = {
  companyName: '',
  cnpj: '',
  address: '',
  city: '',
  periodStart: '',
  periodEnd: '',
  monthlyBilling: [],
  accountantName: 'JORGE ANDRE DOS SANTOS VASCONCELOS',
  accountantCrc: 'PE-020181/O-1',
  accountantCpf: '010.212.714-03',
  reportDate: '',
  reportCity: '',
  logo: 'https://minio.contadordepadaria.com/api/v1/buckets/typebot/objects/download?preview=true&prefix=logos%2FContador%20de%20Padarias%2FLogo%20-%20CP%20AZUL.png&version_id=null'
};

export default function App() {
  const [step, setStep] = useState<'auth' | 'form' | 'loading' | 'report'>('auth');
  const [formData, setFormData] = useState<BillingFormData>(INITIAL_DATA);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '165760') {
      setStep('form');
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPasswordInput('');
    }
  };
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);


  // Pre-load logo as Base64 via proxy to bypass CORS
  useEffect(() => {
    const proxyUrl = '/api/logo-proxy';

    const loadImage = async () => {
      try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Proxy fetch failed');

        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setFormData(prev => ({ ...prev, logo: base64data }));
          setIsLogoLoaded(true);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error('Error loading logo via proxy:', err);
        // Fallback to direct URL if proxy fails (though proxy is more reliable for CORS)
        const logoUrl = 'https://minio.contadordepadaria.com/api/v1/buckets/typebot/objects/download?preview=true&prefix=logos%2FContador%20de%20Padarias%2FLogo%20-%20CP%20AZUL.png&version_id=null';
        setFormData(prev => ({ ...prev, logo: logoUrl }));
        setIsLogoLoaded(true);
      }
    };

    loadImage();
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    let maskedValue = value;

    if (name === 'cnpj') maskedValue = maskCNPJ(value);
    if (name === 'accountantCpf') maskedValue = maskCPF(value);

    setFormData(prev => ({ ...prev, [name]: maskedValue }));
  };



  const handleBillingChange = (index: number, field: keyof MonthlyBilling, value: string) => {
    const newBilling = [...formData.monthlyBilling];
    let finalValue: string | number = value;

    if (field === 'value') {
      finalValue = parseCurrencyInput(value);
    }

    newBilling[index] = { ...newBilling[index], [field]: finalValue };
    setFormData(prev => ({ ...prev, monthlyBilling: newBilling }));
  };

  const addMonth = () => {
    const lastMonth = formData.monthlyBilling[formData.monthlyBilling.length - 1];
    let nextMonth = '';

    if (lastMonth && lastMonth.month.includes('/')) {
      const [m, y] = lastMonth.month.split('/').map(Number);
      let newM = m + 1;
      let newY = y;
      if (newM > 12) {
        newM = 1;
        newY++;
      }
      nextMonth = `${newM.toString().padStart(2, '0')}/${newY}`;
    }

    setFormData(prev => ({
      ...prev,
      monthlyBilling: [...prev.monthlyBilling, { month: nextMonth, value: 0 }]
    }));
  };

  const removeMonth = (index: number) => {
    setFormData(prev => ({
      ...prev,
      monthlyBilling: prev.monthlyBilling.filter((_, i) => i !== index)
    }));
  };

  const generateReport = () => {
    setStep('loading');
    setTimeout(() => {
      setStep('report');
    }, 3000);
  };

  const clearData = () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      setTimeout(() => setIsConfirmingClear(false), 3000);
      return;
    }

    // Force a completely fresh object to ensure React detects the change
    setFormData(prev => ({
      ...INITIAL_DATA,
      logo: prev.logo, // Preserve the already loaded logo
    }));
    setFormKey(prev => prev + 1);
    setIsConfirmingClear(false);
  };

  const downloadPDF = () => {
    const element = document.getElementById('billing-report');
    if (!element) return;

    if (!isLogoLoaded) {
      const confirmProceed = window.confirm('A logomarca ainda está sendo processada para o PDF. Deseja aguardar mais 2 segundos ou gerar assim mesmo?');
      if (!confirmProceed) return;
    }

    setIsGeneratingPDF(true);
    window.scrollTo(0, 0);

    // Pequeno atraso para garantir que tudo esteja renderizado antes da captura
    setTimeout(() => {
      const opt = {
        margin: 0,
        filename: `Relatorio_Faturamento_${formData.companyName.replace(/\s+/g, '_') || 'Empresa'}.pdf`,
        image: { type: 'jpeg' as const, quality: 1.0 },
        html2canvas: {
          scale: 3, // Reduced scale slightly to see if it helps with the blank page
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          logging: false,
          scrollY: 0,
          windowWidth: element.clientWidth,
          windowHeight: element.clientHeight
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const, compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        setIsGeneratingPDF(false);
      }).catch((err: any) => {
        console.error('Erro ao gerar PDF:', err);
        setIsGeneratingPDF(false);
        alert('Ocorreu um erro ao gerar o PDF. Tente usar a opção de imprimir.');
      });
    }, 1000);
  };

  const totalBilling = formData.monthlyBilling.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const formatMonthForReport = (monthStr: string) => {
    if (!monthStr) return '';
    let m, y;
    if (monthStr.includes('-')) {
      const parts = monthStr.split('-');
      y = Number(parts[0]);
      m = Number(parts[1]);
    } else if (monthStr.includes('/')) {
      const parts = monthStr.split('/');
      m = Number(parts[0]);
      y = Number(parts[1]);
    } else {
      return monthStr;
    }

    if (isNaN(m) || isNaN(y)) return monthStr;
    const monthAbbr = MONTHS_SHORT_BR[m - 1];
    const yearShort = y.toString().slice(-2);
    return `${monthAbbr}/${yearShort}`;
  };

  const formatFullMonthYear = (monthStr: string) => {
    if (!monthStr) return 'MM/AAAA';
    if (monthStr.includes('-')) {
      const [y, m] = monthStr.split('-');
      return `${m}/${y}`;
    }
    return monthStr;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <AnimatePresence mode="wait">
        {step === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-screen flex items-center justify-center p-4 relative z-50"
          >
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 w-full max-w-sm text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-navy-900 rounded-2xl mb-6 shadow-lg shadow-navy-900/20">
                <FileText className="text-white w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-navy-900 mb-2">Acesso Restrito</h1>
              <p className="text-slate-500 mb-8 text-sm">Digite a senha para acessar o gerador</p>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (passwordError) setPasswordError(false);
                    }}
                    placeholder="Senha de acesso"
                    className={`w-full px-4 py-3 bg-slate-50 border ${passwordError ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-navy-200'} rounded-xl focus:ring-2 outline-none transition-all text-center text-lg tracking-[0.3em] font-mono`}
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-red-500 text-sm mt-2 font-medium">Senha incorreta.</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full bg-navy-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-navy-800 transition-all active:scale-95 shadow-md shadow-navy-900/20"
                >
                  Acessar Gerador
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {step === 'form' && (
          <motion.div
            key={`form-${formKey}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-5xl mx-auto py-12 px-4"
          >
            <header className="mb-10 text-center relative z-20 flex flex-col items-center">
              <div className="w-full flex justify-end mb-4 md:absolute md:right-0 md:top-0 print:hidden z-50">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    clearData();
                  }}
                  className={`flex items-center gap-2 transition-all text-sm font-bold px-5 py-2.5 rounded-xl shadow-md border cursor-pointer active:scale-95 w-full md:w-auto justify-center ${isConfirmingClear
                    ? 'bg-red-600 text-white border-red-700 animate-pulse'
                    : 'bg-white text-slate-500 hover:text-red-600 border-slate-200'
                    }`}
                >
                  <Trash2 className="w-4 h-4" />
                  {isConfirmingClear ? 'Clique para Confirmar' : 'Limpar Dados'}
                </button>
              </div>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-navy-900 rounded-2xl mb-4 shadow-lg shadow-navy-900/20">
                <FileText className="text-white w-8 h-8" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-navy-900 tracking-tight px-4">Gerador de Relatório de Faturamento</h1>
              <p className="text-slate-500 mt-2 px-4">Preencha os dados abaixo para gerar o documento oficial</p>


            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dados da Empresa */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-navy-600" />
                  <h2 className="font-semibold text-navy-900">Identificação da Empresa</h2>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Razão Social</label>
                  <input
                    type="text"
                    name="companyName"
                    placeholder="Ex: PADARIA EXPRESS LTDA"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">CNPJ</label>
                  <input
                    type="text"
                    name="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={handleInputChange}
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Endereço</label>
                  <input
                    type="text"
                    name="address"
                    placeholder="Rua, Número, Bairro"
                    value={formData.address}
                    onChange={handleInputChange}
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Município</label>
                  <input
                    type="text"
                    name="city"
                    placeholder="Ex: RECIFE"
                    value={formData.city}
                    onChange={handleInputChange}
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none transition-all"
                  />
                </div>
              </section>

              {/* Período e Local */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-navy-600" />
                  <h2 className="font-semibold text-navy-900">Período e Localização</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Início</label>
                    <input
                      type="month"
                      name="periodStart"
                      value={formData.periodStart}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fim</label>
                    <input
                      type="month"
                      name="periodEnd"
                      value={formData.periodEnd}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cidade do Relatório</label>
                  <input
                    type="text"
                    name="reportCity"
                    placeholder="Ex: Recife"
                    value={formData.reportCity}
                    onChange={handleInputChange}
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data do Relatório</label>
                  <input
                    type="text"
                    name="reportDate"
                    placeholder="Ex: 23 de Fevereiro de 2026"
                    value={formData.reportDate}
                    onChange={handleInputChange}
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none transition-all"
                  />
                </div>
              </section>

              {/* Faturamento Mensal */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-navy-600" />
                    <h2 className="font-semibold text-navy-900">Demonstrativo de Faturamento Mensal</h2>
                  </div>
                  <button
                    onClick={addMonth}
                    className="flex items-center gap-1 text-xs font-bold text-navy-600 hover:text-navy-800 transition-colors bg-navy-50 px-4 py-2 rounded-full border border-navy-100"
                  >
                    <Plus className="w-3 h-3" /> Adicionar Mês
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.monthlyBilling.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-end gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                      <div className="w-full sm:flex-1 space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mês/Ano</label>
                        <input
                          type="month"
                          value={item.month ? `${item.month.split('/')[1]}-${item.month.split('/')[0]}` : ''}
                          onChange={(e) => {
                            const [y, m] = e.target.value.split('-');
                            handleBillingChange(index, 'month', `${m}/${y}`);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100 transition-all"
                        />
                      </div>
                      <div className="w-full sm:flex-[1.5] space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receita Bruta (R$)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                          <input
                            type="text"
                            placeholder="0,00"
                            value={item.value ? formatCurrencyInput(item.value.toFixed(2)) : ''}
                            onChange={(e) => handleBillingChange(index, 'value', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm font-medium outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100 transition-all"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeMonth(index)}
                        className="w-full sm:w-auto p-2 text-slate-300 hover:text-red-500 transition-colors bg-white rounded-xl border border-slate-100 flex justify-center items-center"
                        title="Remover mês"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  {formData.monthlyBilling.length === 0 && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                      <div className="bg-slate-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="text-slate-300 w-6 h-6" />
                      </div>
                      <p className="text-slate-400 font-medium">Nenhum mês adicionado.</p>
                      <p className="text-slate-300 text-xs mt-1">Clique no botão acima para começar o preenchimento.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Dados do Contador */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-5 h-5 text-navy-600" />
                  <h2 className="font-semibold text-navy-900">Assinatura Técnica (Contador)</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome Completo</label>
                    <input
                      type="text"
                      name="accountantName"
                      placeholder="Nome do Contador"
                      value={formData.accountantName}
                      onChange={handleInputChange}
                      autoComplete="off"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">CRC</label>
                    <input
                      type="text"
                      name="accountantCrc"
                      placeholder="UF-000000/O-0"
                      value={formData.accountantCrc}
                      onChange={handleInputChange}
                      autoComplete="off"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">CPF</label>
                    <input
                      type="text"
                      name="accountantCpf"
                      placeholder="000.000.000-00"
                      value={formData.accountantCpf}
                      onChange={handleInputChange}
                      autoComplete="off"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-10 flex justify-center px-4">
              <button
                onClick={generateReport}
                disabled={formData.monthlyBilling.length === 0}
                className="w-full md:w-auto bg-navy-900 text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-navy-900/20 hover:bg-navy-800 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Gerar Relatório Profissional
              </button>
            </div>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center"
          >
            <div className="relative">
              <Loader2 className="w-16 h-16 text-navy-900 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-navy-900 rounded-full" />
              </div>
            </div>
            <h2 className="mt-6 text-xl font-semibold text-navy-900">Processando Relatório</h2>
            <p className="text-slate-500 mt-2 animate-pulse">Formatando dados contábeis e aplicando selos institucionais...</p>
          </motion.div>
        )}

        {step === 'report' && (
          <motion.div
            key="report"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-200 min-h-screen py-6 md:py-10 px-2 md:px-4 print:p-0 print:bg-white"
          >
            <div className="max-w-[210mm] mx-auto mb-8 flex flex-col md:flex-row gap-4 justify-between items-center print:hidden">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="w-full md:w-auto flex items-center justify-center gap-2 text-navy-900 font-bold hover:bg-white/80 px-5 py-2.5 rounded-xl transition-all border border-navy-900/10 bg-white/50"
              >
                <ArrowLeft className="w-5 h-5" /> Voltar ao Formulário
              </button>
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={downloadPDF}
                  disabled={isGeneratingPDF}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Gerando...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" /> Baixar Relatório PDF
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Document Preview Wrapper for Mobile Scaling */}
            <div className="overflow-x-auto pb-8 flex justify-center">
              <div className="origin-top scale-[0.45] sm:scale-[0.6] md:scale-[0.8] lg:scale-100 transition-transform">
                {/* A4 Document Container */}
                <div id="billing-report" className="a4-document pdf-bg-white mx-auto shadow-2xl relative overflow-hidden print:shadow-none print:scale-100">

                  {/* Header - Navy Background with Centered Logo */}
                  <div className="absolute top-0 left-0 w-full h-[160px] pdf-bg-navy overflow-hidden flex items-center justify-center">
                    {/* The Logo - Original proportions, elegant size, no cropping */}
                    <img
                      src={formData.logo}
                      alt="Logo Contador de Padarias"
                      className="h-28 w-auto object-contain relative z-20"
                      crossOrigin="anonymous"
                    />

                    {/* The Curve - White ellipse at the bottom */}
                    <div
                      className="absolute bottom-[-90px] left-[-25%] w-[150%] h-[160px] pdf-bg-white z-10"
                      style={{ borderRadius: '100%' }}
                    />
                  </div>

                  {/* Main Content Area */}
                  <div className="relative z-10 pt-[150px] px-[20mm] pb-6">

                    {/* Identification Box - Match Print Style Exactly */}
                    <div className="pdf-border-black p-2.5 mb-2 text-center relative z-10 mx-auto w-full">
                      <h3 className="text-[12px] font-bold pdf-text-black uppercase mb-0.5 tracking-tight">
                        {formData.companyName || 'RAZÃO SOCIAL DA EMPRESA'}
                      </h3>
                      <div className="space-y-0">
                        <p className="text-[10px] pdf-text-black">CNPJ: {formData.cnpj || '00.000.000/0001-00'}</p>
                        <p className="text-[10px] pdf-text-black">Endereço: {formData.address || 'ENDEREÇO'}</p>
                        <p className="text-[10px] pdf-text-black">Município: {formData.city || 'RECIFE'}</p>
                        <p className="text-[11px] font-bold pdf-text-black mt-1">
                          Relatório de Faturamento de {formData.periodStart ? formatFullMonthYear(formData.periodStart) : 'MM/AAAA'} até {formData.periodEnd ? formatFullMonthYear(formData.periodEnd) : 'MM/AAAA'}
                        </p>
                      </div>
                    </div>

                    {/* Billing Table */}
                    <div className="w-full">
                      {formData.monthlyBilling.length > 12 ? (
                        <div className="grid grid-cols-2 gap-x-12">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b-2 pdf-border-slate-200">
                                <th className="text-left py-1.5 text-[11px] font-bold pdf-text-slate-800">Mês / Ano</th>
                                <th className="text-right py-1.5 text-[11px] font-bold pdf-text-slate-800">Receita Bruta</th>
                              </tr>
                            </thead>
                            <tbody>
                              {formData.monthlyBilling.slice(0, Math.ceil(formData.monthlyBilling.length / 2)).map((item, index) => (
                                <tr key={index} className="border-b pdf-border-slate-100">
                                  <td className="py-1 text-[11px] pdf-text-slate-700">{formatMonthForReport(item.month)}</td>
                                  <td className="py-1 text-[11px] pdf-text-slate-700 text-right font-mono">{formatCurrency(item.value)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b-2 pdf-border-slate-200">
                                <th className="text-left py-1.5 text-[11px] font-bold pdf-text-slate-800">Mês / Ano</th>
                                <th className="text-right py-1.5 text-[11px] font-bold pdf-text-slate-800">Receita Bruta</th>
                              </tr>
                            </thead>
                            <tbody>
                              {formData.monthlyBilling.slice(Math.ceil(formData.monthlyBilling.length / 2)).map((item, index) => (
                                <tr key={index} className="border-b pdf-border-slate-100">
                                  <td className="py-1 text-[11px] pdf-text-slate-700">{formatMonthForReport(item.month)}</td>
                                  <td className="py-1 text-[11px] pdf-text-slate-700 text-right font-mono">{formatCurrency(item.value)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 pdf-border-slate-200">
                              <th className="text-left py-1.5 text-[11px] font-bold pdf-text-slate-800">Mês / Ano</th>
                              <th className="text-right py-1.5 text-[11px] font-bold pdf-text-slate-800">Receita Bruta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.monthlyBilling.map((item, index) => (
                              <tr key={index} className="border-b pdf-border-slate-100">
                                <td className="py-1 text-[11px] pdf-text-slate-700">{formatMonthForReport(item.month)}</td>
                                <td className="py-1 text-[11px] pdf-text-slate-700 text-right font-mono">{formatCurrency(item.value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {/* Total Section */}
                      <div className="mt-2 flex justify-between items-center border-t-2 pdf-border-navy pt-1.5">
                        <span className="text-xs font-bold pdf-text-slate-900">Total Geral</span>
                        <span className="text-sm font-bold pdf-text-navy font-mono">{formatCurrency(totalBilling)}</span>
                      </div>

                      {/* Date and Signature - Moved right below total */}
                      <div className="mt-8 text-center">
                        <p className="text-[10px] pdf-text-slate-700 mb-32">{formData.reportCity || 'Cidade'}, {formData.reportDate || 'Data'}</p>

                        <div className="max-w-[350px] mx-auto">
                          <div className="border-t pdf-border-slate-900 mb-1"></div>
                          <p className="text-[10px] font-bold pdf-text-slate-900 uppercase">{formData.accountantName || 'NOME DO CONTADOR'}</p>
                          <p className="text-[10px] pdf-text-slate-600">
                            CRC: {formData.accountantCrc || 'PE-020181/O-1'} &nbsp;&nbsp; CPF: {formData.accountantCpf || '010.212.714-03'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer - Locked at the absolute bottom of the A4 document */}
                  <div className="absolute bottom-8 left-0 w-full text-center px-[20mm] z-20">
                    <p className="text-[9px] pdf-text-slate-400 uppercase tracking-widest leading-relaxed font-medium mb-1">
                      RIO MAR TRADE CENTER 3, AVENIDA REPÚBLICA DO LÍBANO, 251, SALA 2801 TORRE C ANDAR 28, PINA, RECIFE
                    </p>
                    <p className="text-[10px] pdf-text-slate-500 font-bold uppercase tracking-wide">
                      E-MAIL: contato@contadordepadaria.com.br &nbsp;&nbsp;|&nbsp;&nbsp; SITE: www.cptoconnect.com.br
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .bg-navy-900 { background-color: #0F172A; }
        .text-navy-900 { color: #0F172A; }
        .text-navy-600 { color: #1E293B; }
        .focus\\:ring-navy-500:focus { --tw-ring-color: #0F172A; }
        .bg-navy-50 { background-color: #F8FAFC; }

        /* PDF Compatibility Classes (Hex-based colors to avoid oklch/oklab errors) */
        .pdf-text-white { color: #ffffff !important; }
        .pdf-bg-white { background-color: #ffffff !important; }
        .pdf-bg-navy { background-color: #0B0F7A !important; }
        .pdf-text-navy { color: #0B0F7A !important; }
        .pdf-border-navy-light { border-color: #d1d4f0 !important; } /* #0B0F7A at 20% opacity over white */
        .pdf-border-navy { border-color: #0B0F7A !important; }
        .pdf-border-black { border: 1px solid #000000 !important; }
        .pdf-text-black { color: #000000 !important; }
        .pdf-text-slate-900 { color: #0f172a !important; }
        .pdf-text-slate-800 { color: #1e293b !important; }
        .pdf-text-slate-700 { color: #334155 !important; }
        .pdf-text-slate-600 { color: #475569 !important; }
        .pdf-text-slate-500 { color: #64748b !important; }
        .pdf-text-slate-400 { color: #94a3b8 !important; }
        .pdf-bg-slate-50 { background-color: #f8fafc !important; }
        .pdf-border-slate-900 { border-color: #0f172a !important; }
        .pdf-border-slate-200 { border-color: #e2e8f0 !important; }
        .pdf-border-slate-100 { border-color: #f1f5f9 !important; }
        .pdf-text-gold { color: #F2C400 !important; }

        .a4-document {
          width: 210mm;
          height: 296.8mm; /* Slightly less than 297mm to prevent blank second page */
          background: white;
          position: relative;
          overflow: hidden; /* Prevent any content from spilling out */
        }

        /* Custom month input styling */
        input[type="month"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          filter: invert(0.5);
        }

        @media print {
          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }
          .min-h-screen {
            min-height: auto !important;
          }
          .a4-document {
            width: 100%;
            height: 100%;
            margin: 0;
            box-shadow: none;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }

        @page {
          size: A4;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
