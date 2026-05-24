import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, X, BrainCircuit, TrendingUp, TrendingDown, AlertTriangle, Lightbulb } from 'lucide-react';
import { AIAdvisorService, FinancialReportData } from '@/services/aiAdvisorService';

interface FinancialAIAdvisorProps {
  reportData: FinancialReportData;
}

export function FinancialAIAdvisor({ reportData }: FinancialAIAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsOpen(true);
    
    // Se já analisou com os exatos mesmos dados, não precisa rodar de novo
    // Aqui estamos chamando de novo sempre pra garantir dados atualizados
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await AIAdvisorService.analyzeFinancialPeriod(reportData);
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err.message || "Erro ao gerar análise.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Processamento simples do markdown retornado para renderizar ícones
  const renderMarkdownText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('###')) {
        const title = line.replace('### ', '');
        let icon = <BrainCircuit className="w-5 h-5 text-blue-500" />;
        if (title.toLowerCase().includes('resumo')) icon = <BrainCircuit className="w-5 h-5 text-blue-500" />;
        if (title.toLowerCase().includes('fortes')) icon = <TrendingUp className="w-5 h-5 text-green-500" />;
        if (title.toLowerCase().includes('atenção')) icon = <AlertTriangle className="w-5 h-5 text-amber-500" />;
        if (title.toLowerCase().includes('ação')) icon = <Lightbulb className="w-5 h-5 text-purple-500" />;

        return (
          <h3 key={idx} className="flex items-center gap-2 mt-6 mb-2 text-lg font-bold font-display text-foreground">
            {icon} {title}
          </h3>
        );
      }
      
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 mb-1 text-sm text-muted-foreground list-disc marker:text-blue-500">
            {line.replace(/^(\* |- )/, '')}
          </li>
        );
      }

      if (line.trim() === '') return <br key={idx} />;

      // Bolds simples **texto**
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        return (
          <p key={idx} className="mb-2 text-sm text-muted-foreground leading-relaxed">
            {parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part)}
          </p>
        );
      }

      return <p key={idx} className="mb-2 text-sm text-muted-foreground leading-relaxed">{line}</p>;
    });
  };

    <div className="w-full mt-6 space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={isOpen ? () => setIsOpen(false) : handleAnalyze}
          variant={isOpen ? "outline" : "default"}
          className={`gap-2 transition-all duration-300 ${!isOpen ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 hover:scale-105' : ''}`}
        >
          {isOpen ? <X className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {isOpen ? "Fechar Consultoria" : "Consultoria IA"}
        </Button>
      </div>

      {isOpen && (
        <div className="w-full bg-card/90 backdrop-blur-xl border border-border/50 shadow-xl rounded-2xl overflow-hidden animate-in slide-in-from-top-4 fade-in duration-500">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-background/50">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Sparkles className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">Consultor Financeiro</h2>
              <p className="text-[11px] text-muted-foreground font-medium">IA Baseada em seu Histórico</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center space-y-4 text-center py-8 animate-pulse">
                <div className="w-16 h-16 relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                  <div className="absolute inset-2 bg-blue-500/40 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">A IA está analisando seus dados...</p>
                  <p className="text-sm text-muted-foreground">Isso leva apenas alguns segundos.</p>
                </div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-sm text-center">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-80" />
                {error}
              </div>
            ) : analysisResult ? (
              <div className="space-y-1 animate-in fade-in duration-700">
                {renderMarkdownText(analysisResult)}
              </div>
            ) : null}
          </div>
          
          {/* Footer */}
          <div className="p-3 border-t border-border/50 bg-background/50 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Análise gerada por GroqCloud IA
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
