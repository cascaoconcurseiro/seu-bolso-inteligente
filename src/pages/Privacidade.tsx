import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="font-display font-black text-lg tracking-tight">Política de Privacidade</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 text-sm leading-relaxed">
        <p className="text-muted-foreground">Última atualização: junho de 2026 · Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</p>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">1. Quem somos</h2>
          <p>O <strong>Pé de Meia</strong> é um aplicativo de gestão financeira pessoal. Somos o controlador dos seus dados pessoais nos termos da LGPD.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">2. Quais dados coletamos</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>E-mail e nome (para criação de conta)</li>
            <li>Dados financeiros que você registra (transações, contas, metas, viagens)</li>
            <li>Preferências de uso e configurações do aplicativo</li>
            <li>Logs técnicos anônimos para diagnóstico de erros</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">3. Para que usamos seus dados</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Fornecer e melhorar as funcionalidades do aplicativo</li>
            <li>Autenticar seu acesso com segurança</li>
            <li>Sincronizar seus dados entre dispositivos</li>
            <li>Enviar notificações que você configurou</li>
          </ul>
          <p className="font-medium text-foreground">Nunca vendemos ou compartilhamos seus dados com terceiros para fins publicitários.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">4. Base legal (art. 7º LGPD)</h2>
          <p className="text-muted-foreground">O tratamento é fundamentado no <strong>contrato</strong> (execução do serviço que você contratou) e no <strong>legítimo interesse</strong> (segurança e melhoria do serviço), nos termos do art. 7º, incisos V e IX da LGPD.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">5. Compartilhamento de dados</h2>
          <p className="text-muted-foreground">Utilizamos a infraestrutura da <strong>Supabase</strong> (banco de dados e autenticação) e da <strong>Vercel</strong> (hospedagem), ambas com políticas de privacidade próprias e conformidade com padrões internacionais de segurança. Não há compartilhamento com outros terceiros.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">6. Retenção de dados</h2>
          <p className="text-muted-foreground">Seus dados são mantidos enquanto você possuir uma conta ativa. Após a exclusão da conta, os dados são removidos permanentemente em até 30 dias, exceto quando a retenção for exigida por lei.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">7. Seus direitos (art. 18 LGPD)</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong>Acesso</strong>: visualize seus dados a qualquer momento no app</li>
            <li><strong>Portabilidade</strong>: exporte todos os seus dados em JSON (Configurações › Privacidade)</li>
            <li><strong>Eliminação</strong>: exclua sua conta e todos os dados (Configurações › Privacidade)</li>
            <li><strong>Correção</strong>: edite seus dados diretamente no aplicativo</li>
            <li><strong>Revogação do consentimento</strong>: entre em contato conosco</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">8. Segurança</h2>
          <p className="text-muted-foreground">Todos os dados são transmitidos via HTTPS e armazenados com criptografia. O acesso é protegido por Row Level Security (RLS) no banco de dados, garantindo que cada usuário acesse apenas seus próprios dados.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">9. Contato e DPO</h2>
          <p className="text-muted-foreground">Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato pelo e-mail do suporte disponível no aplicativo. Respondemos em até 15 dias úteis, conforme prazo da LGPD.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">10. Alterações nesta política</h2>
          <p className="text-muted-foreground">Eventuais atualizações serão comunicadas no aplicativo com antecedência de 15 dias, exceto em casos de exigência legal imediata.</p>
        </section>
      </main>
    </div>
  );
}
