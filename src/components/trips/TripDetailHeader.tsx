import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Coins, Pencil, MoreVertical, Plus, Archive, ArchiveRestore, Trash2, MapPin, Globe, Download, FileDown, RefreshCcw } from "lucide-react";
import { useCurrencyRate } from "@/hooks/useCurrencyRate";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";

interface TripDetailHeaderProps {
  trip: any;
  permissions: any;
  participants?: any[];
  onBack: () => void;
  onEdit: () => void;
  onAddParticipant: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onOpenBudget: () => void;
  hasPersonalBudget: boolean;
  onExportPDF: () => void;
  onExportExcel: () => void;
}

export function TripDetailHeader({
  trip,
  permissions,
  participants,
  onBack,
  onEdit,
  onAddParticipant,
  onArchive,
  onUnarchive,
  onDelete,
  onOpenBudget,
  hasPersonalBudget,
  onExportPDF,
  onExportExcel
}: TripDetailHeaderProps) {
  const currency = trip.currency || 'BRL';
  const { data: realTimeRate, isLoading: isRateLoading } = useCurrencyRate(currency !== 'BRL' ? currency : '', 'BRL');

  return (
    <div className="relative overflow-hidden rounded-[2rem] p-5 md:p-8 transition-all duration-700 ease-out bg-background/60 backdrop-blur-xl border border-border/40 shadow-sm mb-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            className="mt-1 rounded-full h-11 w-11 hover:bg-muted transition-all active:scale-95 shrink-0 shadow-sm border border-border/40"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Button>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display font-black text-3xl md:text-5xl tracking-tighter text-foreground truncate">
                {trip.name}
              </h1>
              <div className="flex gap-2">
                {trip.is_archived && (
                  <span className="px-3 py-1 rounded-full bg-muted/80 text-[10px] font-black text-muted-foreground uppercase tracking-widest border border-border/50 flex items-center shadow-sm">
                    Arquivada
                  </span>
                )}
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center shadow-sm",
                  trip.status === "ACTIVE" 
                    ? "bg-green-500/10 text-green-600 border-green-500/20" 
                    : trip.status === "PLANNING"
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                    : "bg-muted text-muted-foreground border-border/50"
                )}>
                  {trip.status === "PLANNING" ? "Planejando" :
                   trip.status === "ACTIVE" ? "Em andamento" :
                   trip.status === "COMPLETED" ? "Finalizada" : "Cancelada"}
                </span>
                
                {participants && participants.length > 0 && (
                  <div 
                    className="flex -space-x-2 ml-2 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={onAddParticipant}
                    title="Gerenciar participantes"
                  >
                    {participants.slice(0, 4).map((p) => (
                      <div key={p.id || p.user_id} className="hover:scale-110 transition-transform hover:z-10 relative z-0">
                        <UserAvatar 
                          name={p.name} 
                          avatarUrl={p.avatar_url} 
                          size="sm" 
                          className="w-8 h-8 border-2 border-background shadow-sm"
                        />
                      </div>
                    ))}
                    {participants.length > 4 && (
                      <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground z-0 relative shadow-sm">
                        +{participants.length - 4}
                      </div>
                    )}
                    {permissions?.isOwner && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-primary z-0 relative ml-1 hover:bg-primary/20 transition-colors shadow-sm">
                        <Plus className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {trip.destination && (
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="h-4 w-4 text-primary/70" />
                  {trip.destination}
                </span>
              )}
              <span className="flex items-center gap-1.5 font-medium">
                <Globe className="h-4 w-4 text-primary/70" />
                Moeda: <strong className="text-foreground">{trip.currency}</strong>
              </span>
              {currency !== 'BRL' && (
                <span className="flex items-center gap-1.5 font-medium px-2.5 py-1 bg-card/60 backdrop-blur shadow-sm border border-border/50 rounded-lg">
                  {isRateLoading ? (
                    <RefreshCcw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : realTimeRate ? (
                    <span className="font-mono text-xs font-bold text-foreground">
                      1 {currency} = R$ {realTimeRate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Cotação indisponível</span>
                  )}
                </span>
              )}
              <span className="flex items-center gap-1.5 font-medium">
                <User className="h-4 w-4 text-primary/70" />
                {permissions?.isOwner ? "Proprietário" : "Colaborador"}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <Button
            variant={hasPersonalBudget ? "outline" : "default"}
            size="default"
            onClick={onOpenBudget}
            className={cn(
              "gap-2 rounded-2xl h-12 px-6 transition-all hover:-translate-y-1 font-bold",
              !hasPersonalBudget ? "shadow-xl shadow-primary/20 hover:shadow-primary/30" : "bg-card/50 backdrop-blur-sm"
            )}
          >
            <Coins className="h-5 w-5" />
            <span>{hasPersonalBudget ? "Meu Orçamento" : "Definir Orçamento"}</span>
          </Button>
          
          {permissions?.isOwner && (
            <>
              <Button
                variant="outline"
                size="default"
                onClick={onEdit}
                className="gap-2 rounded-2xl h-12 px-5 hover:bg-muted transition-all active:scale-95 bg-card/50 backdrop-blur-sm"
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline font-bold">Editar</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-2xl h-12 w-12 hover:bg-muted transition-all active:scale-95 bg-card/50 backdrop-blur-sm shadow-sm"
                  >
                    <MoreVertical className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-xl border-border/50 backdrop-blur-sm">
                  <DropdownMenuItem
                    onClick={onAddParticipant}
                    className="gap-3 rounded-lg py-2.5 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 text-primary" />
                    <span>Adicionar participante</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="my-1" />
                  
                  <DropdownMenuItem
                    onClick={onExportPDF}
                    className="gap-3 rounded-lg py-2.5 cursor-pointer"
                  >
                    <FileDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Exportar Relatório PDF</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={onExportExcel}
                    className="gap-3 rounded-lg py-2.5 cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Exportar Planilha Excel</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="my-1" />
                  
                  {trip.is_archived ? (
                    <DropdownMenuItem
                      onClick={onUnarchive}
                      className="gap-3 rounded-lg py-2.5 cursor-pointer"
                    >
                      <ArchiveRestore className="h-4 w-4 text-primary" />
                      <span>Desarquivar viagem</span>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={onArchive}
                      className="gap-3 rounded-lg py-2.5 cursor-pointer"
                    >
                      <Archive className="h-4 w-4 text-muted-foreground" />
                      <span>Arquivar viagem</span>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator className="my-1" />
                  
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="gap-3 rounded-lg py-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Excluir viagem</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
