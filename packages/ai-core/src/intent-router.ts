export type ChatIntentRoute =
  | "live_data_or_knowledge"
  | "mutation_blocked"
  | "ambiguous";

export type ChatIntentRouterInput = {
  question: string;
  queryOnly: boolean;
  currentModule?: string;
  hasRecentModuleContext?: boolean;
};

const STOPWORDS = new Set([
  "a",
  "al",
  "and",
  "are",
  "as",
  "de",
  "del",
  "do",
  "el",
  "en",
  "es",
  "for",
  "hay",
  "i",
  "is",
  "la",
  "las",
  "lo",
  "los",
  "me",
  "mi",
  "my",
  "of",
  "por",
  "que",
  "qué",
  "se",
  "si",
  "sí",
  "the",
  "to",
  "un",
  "una",
  "yo",
]);

const DOMAIN_KEYWORDS = [
  "arrears",
  "audiencia",
  "audiencias",
  "buildings",
  "cargo",
  "cargos",
  "charges",
  "cliente",
  "clientes",
  "cobranza",
  "cobranzas",
  "debo",
  "comunicado",
  "comunicados",
  "communications",
  "deuda",
  "document",
  "documents",
  "documento",
  "documentos",
  "edificio",
  "edificios",
  "expediente",
  "expedientes",
  "finanzas",
  "morosidad",
  "moroso",
  "morosos",
  "occupancy",
  "pago",
  "pagos",
  "payment",
  "payments",
  "resident",
  "residente",
  "residentes",
  "saldo",
  "soporte",
  "support",
  "ticket",
  "tickets",
  "torre",
  "unidad",
  "unidades",
  "units",
  "vacant",
];

export class ChatIntentRouter {
  route(input: ChatIntentRouterInput): ChatIntentRoute {
    if (input.queryOnly && this.isMutationRequest(input.question)) {
      return "mutation_blocked";
    }

    if (
      this.isAmbiguousRequest(
        input.question,
        input.currentModule,
        input.hasRecentModuleContext === true
      )
    ) {
      return "ambiguous";
    }

    return "live_data_or_knowledge";
  }

  isMutationRequest(question: string): boolean {
    const normalized = ` ${this.normalizeText(question)} `;
    if (this.isHowToMutationQuestion(normalized)) {
      return false;
    }

    if (this.isReadOnlyPendingPaymentsQuery(normalized)) {
      return false;
    }

    const mutationPatterns = [
      /\b(aprueba|aprobar|aproba|approve|accept)\b/,
      /\b(rechaza|rechazar|reject)\b/,
      /\b(crea|crear|create|nuevo ticket|nueva unidad|nuevo comunicado)\b/,
      /\b(edita|editar|modifica|modificar|actualiza|actualizar|edit|update|modify)\b/,
      /\b(elimina|eliminar|borra|borrar|delete|remove)\b/,
      /\b(asigna|asignar|assign)\b/,
      /\b(publica|publicar|publish)\b/,
      /\b(envia|enviar|send)\b/,
      /\b(sube|subir|carga|cargar|upload)\b/,
      /\b(reporta|reportar)\s+(un\s+)?pago\b/,
      /\b(marca|marcar)\s+.*\s+pagad[oa]s?\b/,
      /\bmark\s+.*\s+paid\b/,
    ];

    return mutationPatterns.some((pattern) => pattern.test(normalized));
  }

  private isHowToMutationQuestion(normalizedQuestion: string): boolean {
    const howToPatterns = [
      /\bcomo\s+(puedo\s+)?(crear|aprobar|rechazar|editar|modificar|actualizar|eliminar|borrar|asignar|publicar|enviar|subir|cargar|reportar)\b/,
      /\bcómo\s+(puedo\s+)?(crear|aprobar|rechazar|editar|modificar|actualizar|eliminar|borrar|asignar|publicar|enviar|subir|cargar|reportar)\b/,
      /\bhow\s+(do|can)\s+i\s+(create|approve|reject|edit|update|modify|delete|remove|assign|publish|send|upload|report)\b/,
      /\bsteps?\s+to\s+(create|approve|reject|edit|update|modify|delete|remove|assign|publish|send|upload|report)\b/,
      /\bpasos\s+para\s+(crear|aprobar|rechazar|editar|modificar|actualizar|eliminar|borrar|asignar|publicar|enviar|subir|cargar|reportar)\b/,
    ];

    return howToPatterns.some((pattern) => pattern.test(normalizedQuestion));
  }

  private isReadOnlyPendingPaymentsQuery(normalized: string): boolean {
    const hasQueryPattern = /\b(cuantos?|hay|mostrame|listar)\b/i.test(normalized);
    const hasPendingPayments = /pendiente|siniaprobar|sinrev|revis/i.test(normalized);
    const hasPaymentRef = /\bpago|pagos\b/i.test(normalized);
    return hasQueryPattern && hasPendingPayments && hasPaymentRef;
  }

  private isAmbiguousRequest(
    question: string,
    currentModule: string | undefined,
    hasRecentModuleContext: boolean
  ): boolean {
    const normalized = this.normalizeText(question);
    const tokens = this.tokenize(normalized);

    if (tokens.length === 0) {
      return true;
    }

    if (this.hasDomainKeyword(normalized)) {
      return false;
    }

    if (this.hasConcreteModuleContext(currentModule)) {
      return false;
    }

    if (hasRecentModuleContext && this.isFollowUpReference(normalized)) {
      return false;
    }

    const significantTokenCount = tokens.filter(
      (token) => token.length > 1 && !STOPWORDS.has(token)
    ).length;

    if (tokens.length <= 2) {
      return true;
    }

    if (this.isReferentialQuestion(normalized)) {
      return true;
    }

    if (
      tokens.length <= 4 &&
      this.startsWithInterrogative(normalized) &&
      significantTokenCount <= 1
    ) {
      return true;
    }

    return false;
  }

  private hasDomainKeyword(normalizedQuestion: string): boolean {
    return DOMAIN_KEYWORDS.some((keyword) =>
      normalizedQuestion.includes(keyword)
    );
  }

  private hasConcreteModuleContext(currentModule: string | undefined): boolean {
    if (!currentModule) {
      return false;
    }

    const normalizedModule = this.normalizeText(currentModule);
    return normalizedModule.length > 0 && normalizedModule !== "general";
  }

  private isFollowUpReference(normalizedQuestion: string): boolean {
    return /(^|\s)(y|and)\b/.test(normalizedQuestion)
      || /\b(ahora|despues|después|siguiente|next)\b/.test(normalizedQuestion)
      || /\b(esto|eso|esa|ese|anterior|arriba|that|this|it)\b/.test(normalizedQuestion);
  }

  private isReferentialQuestion(normalizedQuestion: string): boolean {
    return /\b(esto|eso|esa|ese|this|that|it)\b/.test(normalizedQuestion)
      || /(^|\s)(y|and)\b/.test(normalizedQuestion);
  }

  private startsWithInterrogative(normalizedQuestion: string): boolean {
    return /^(que|cual|cuales|como|cuanto|cuantos|what|which|how|where|when)\b/.test(
      normalizedQuestion
    );
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .trim();
  }

  private tokenize(normalizedQuestion: string): string[] {
    return normalizedQuestion.split(/\s+/).filter((token) => token.length > 0);
  }
}
