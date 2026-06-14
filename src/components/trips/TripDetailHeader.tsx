import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Coins, Pencil, MoreVertical, Plus, Archive, ArchiveRestore, Trash2, MapPin, Globe, Download, FileDown, RefreshCcw } from "lucide-react";
import { useCurrencyRate } from "@/hooks/useCurrencyRate";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TripDetailHeaderProps {
  trip: any;
  permissions: any;
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
    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 pb-6">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onBack} 
        className="rounded-full h-11 w-11 hover:bg-muted transition-colors shrink-0"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight text-foreground truncate">
            {trip.name}
          </h1>
          <div className="flex gap-2">
            {trip.is_archived && (
              <span className="px-2.5 py-0.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-border/50">
                Arquivada
              </span>
            )}
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
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
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {trip.destination && (
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {trip.destination}
            </span>
          )}
          <span className="flex items-center gap-1.5 font-medium">
            <Globe className="h-3.5 w-3.5 text-primary" />
            Moeda: {trip.currency}
          </span>
          {currency !== 'BRL' && (
            <span className="flex items-center gap-1.5 font-medium px-2 py-0.5 bg-background border border-border/50 rounded-md">
              {isRateLoading ? (
                <RefreshCcw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : realTimeRate ? (
                <span className="font-mono text-xs">
                  1 {currency} = R$ {realTimeRate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Cotação indisponível</span>
              )}
            </span>
          )}
          <span className="flex items-center gap-1.5 font-medium">
            <User className="h-3.5 w-3.5 text-primary" />
            {permissions?.isOwner ? "Proprietário" : "Colaborador"}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-2 md:mt-0">
        <Button
          variant={hasPersonalBudget ? "outline" : "default"}
          size="sm"
          onClick={onOpenBudget}
          className={cn(
            "gap-2 rounded-xl h-10 px-4 transition-all hover:scale-105",
            !hasPersonalBudget && "shadow-lg shadow-primary/20"
          )}
        >
          <Coins className="h-4 w-4" />
          <span>{hasPersonalBudget ? "Meu Orçamento" : "Definir Orçamento"}</span>
        </Button>
        
        {permissions?.isOwner && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="gap-2 rounded-xl h-10 px-4 hover:bg-muted transition-all"
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-10 w-10 p-0 hover:bg-muted transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
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
  );
}
