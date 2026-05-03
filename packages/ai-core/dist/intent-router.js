"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatIntentRouter = void 0;
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
class ChatIntentRouter {
    route(input) {
        if (input.queryOnly && this.isMutationRequest(input.question)) {
            return "mutation_blocked";
        }
        if (this.isAmbiguousRequest(input.question, input.currentModule, input.hasRecentModuleContext === true)) {
            return "ambiguous";
        }
        return "live_data_or_knowledge";
    }
    isMutationRequest(question) {
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
    isHowToMutationQuestion(normalizedQuestion) {
        const howToPatterns = [
            /\bcomo\s+(puedo\s+)?(crear|aprobar|rechazar|editar|modificar|actualizar|eliminar|borrar|asignar|publicar|enviar|subir|cargar|reportar)\b/,
            /\bcómo\s+(puedo\s+)?(crear|aprobar|rechazar|editar|modificar|actualizar|eliminar|borrar|asignar|publicar|enviar|subir|cargar|reportar)\b/,
            /\bhow\s+(do|can)\s+i\s+(create|approve|reject|edit|update|modify|delete|remove|assign|publish|send|upload|report)\b/,
            /\bsteps?\s+to\s+(create|approve|reject|edit|update|modify|delete|remove|assign|publish|send|upload|report)\b/,
            /\bpasos\s+para\s+(crear|aprobar|rechazar|editar|modificar|actualizar|eliminar|borrar|asignar|publicar|enviar|subir|cargar|reportar)\b/,
        ];
        return howToPatterns.some((pattern) => pattern.test(normalizedQuestion));
    }
    isReadOnlyPendingPaymentsQuery(normalized) {
        const hasQueryPattern = /\b(cuantos?|hay|mostrame|listar)\b/i.test(normalized);
        const hasPendingPayments = /pendiente|siniaprobar|sinrev|revis/i.test(normalized);
        const hasPaymentRef = /\bpago|pagos\b/i.test(normalized);
        return hasQueryPattern && hasPendingPayments && hasPaymentRef;
    }
    isAmbiguousRequest(question, currentModule, hasRecentModuleContext) {
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
        const significantTokenCount = tokens.filter((token) => token.length > 1 && !STOPWORDS.has(token)).length;
        if (tokens.length <= 2) {
            return true;
        }
        if (this.isReferentialQuestion(normalized)) {
            return true;
        }
        if (tokens.length <= 4 &&
            this.startsWithInterrogative(normalized) &&
            significantTokenCount <= 1) {
            return true;
        }
        return false;
    }
    hasDomainKeyword(normalizedQuestion) {
        return DOMAIN_KEYWORDS.some((keyword) => normalizedQuestion.includes(keyword));
    }
    hasConcreteModuleContext(currentModule) {
        if (!currentModule) {
            return false;
        }
        const normalizedModule = this.normalizeText(currentModule);
        return normalizedModule.length > 0 && normalizedModule !== "general";
    }
    isFollowUpReference(normalizedQuestion) {
        return /(^|\s)(y|and)\b/.test(normalizedQuestion)
            || /\b(ahora|despues|después|siguiente|next)\b/.test(normalizedQuestion)
            || /\b(esto|eso|esa|ese|anterior|arriba|that|this|it)\b/.test(normalizedQuestion);
    }
    isReferentialQuestion(normalizedQuestion) {
        return /\b(esto|eso|esa|ese|this|that|it)\b/.test(normalizedQuestion)
            || /(^|\s)(y|and)\b/.test(normalizedQuestion);
    }
    startsWithInterrogative(normalizedQuestion) {
        return /^(que|cual|cuales|como|cuanto|cuantos|what|which|how|where|when)\b/.test(normalizedQuestion);
    }
    normalizeText(value) {
        return value
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .replace(/[^\p{L}\p{N}\s]/gu, " ")
            .trim();
    }
    tokenize(normalizedQuestion) {
        return normalizedQuestion.split(/\s+/).filter((token) => token.length > 0);
    }
}
exports.ChatIntentRouter = ChatIntentRouter;
