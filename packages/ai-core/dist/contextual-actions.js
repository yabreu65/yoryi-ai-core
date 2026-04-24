"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProactiveQuestion = isProactiveQuestion;
exports.detectModuleFromQuestion = detectModuleFromQuestion;
exports.prioritizeActionsByContext = prioritizeActionsByContext;
exports.getProactiveActions = getProactiveActions;
exports.limitActionsByContext = limitActionsByContext;
exports.getContextualFallback = getContextualFallback;
exports.formatContextualAnswer = formatContextualAnswer;
const MODULE_CONTEXT_KEYWORDS = {
    tickets: ["ticket", "soporte", "support", "issue", "problema", "ayuda"],
    payments: ["pago", "payment", "balance", "saldo", "cargo", "charge", "deuda"],
    charges: ["cargo", "charge", "deuda", "balance", "saldo"],
    communications: ["comunicado", "communication", "aviso", "notice", "mensaje", "inbox"],
    documents: ["documento", "document", "archivo", "file", "reglamento", "regulation", "rules"],
    buildings: ["building", "edificio", "propiedad"],
    units: ["unit", "unidad", "apartamento"],
};
const MODULE_DEFAULT_ACTIONS = {
    tickets: ["open-tickets", "view-my-tickets", "create-ticket"],
    payments: ["view-my-balance", "view-pending-charges", "view-payment-history", "report-payment"],
    charges: ["view-my-balance", "view-pending-charges"],
    communications: ["open-communications", "view-my-inbox", "view-notices"],
    documents: ["open-documents", "view-building-documents", "view-rules"],
    buildings: ["open-buildings"],
    units: ["open-units"],
};
const PROACTIVE_QUESTIONS = [
    "help",
    "help me",
    "what can i do",
    "what can i do here",
    "what now",
    "i'm lost",
    "lost",
    "what's pending",
    "pending",
    "show me what matters",
    "que puedo hacer",
    "ayuda",
    "que hacer",
    "estoy perdido",
    "que tengo pendiente",
];
function isProactiveQuestion(question) {
    const normalized = question.toLowerCase().trim();
    return PROACTIVE_QUESTIONS.includes(normalized);
}
function detectModuleFromQuestion(question) {
    const normalized = question.toLowerCase();
    for (const [module, keywords] of Object.entries(MODULE_CONTEXT_KEYWORDS)) {
        if (keywords.some((kw) => normalized.includes(kw))) {
            return module;
        }
    }
    return null;
}
function prioritizeActionsByContext(actions, hint, question) {
    if (actions.length === 0)
        return actions;
    const questionModule = detectModuleFromQuestion(question);
    const contextModule = hint.currentModule || extractModuleFromRoute(hint.currentRoute);
    if (!questionModule && !contextModule) {
        return actions;
    }
    const relevantModule = questionModule || contextModule;
    if (!relevantModule) {
        return actions;
    }
    const prioritizedKeys = MODULE_DEFAULT_ACTIONS[relevantModule] || [];
    const prioritized = [];
    const others = [];
    for (const action of actions) {
        if (prioritizedKeys.includes(action.key)) {
            prioritized.push(action);
        }
        else {
            others.push(action);
        }
    }
    return [...prioritized, ...others];
}
function getProactiveActions(actions, hint) {
    const contextModule = hint.currentModule || extractModuleFromRoute(hint.currentRoute);
    if (!contextModule || !MODULE_DEFAULT_ACTIONS[contextModule]) {
        return actions.slice(0, 3);
    }
    const defaults = MODULE_DEFAULT_ACTIONS[contextModule];
    const found = [];
    const others = [];
    for (const action of actions) {
        if (defaults.includes(action.key)) {
            found.push(action);
        }
        else {
            others.push(action);
        }
    }
    return [...found.slice(0, 3), ...others.slice(0, 2)];
}
function limitActionsByContext(actions, hint, _question) {
    const contextModule = hint.currentModule || extractModuleFromRoute(hint.currentRoute);
    const relevantKeys = contextModule ? MODULE_DEFAULT_ACTIONS[contextModule] || [] : [];
    const relevant = [];
    const other = [];
    for (const action of actions) {
        if (relevantKeys.includes(action.key)) {
            relevant.push(action);
        }
        else {
            other.push(action);
        }
    }
    const combined = [...relevant, ...other];
    return combined.slice(0, 5);
}
function getContextualFallback(hint, question) {
    const contextModule = hint.currentModule || extractModuleFromRoute(hint.currentRoute);
    if (!contextModule || contextModule === "general") {
        return null;
    }
    const contextHints = {
        tickets: [
            "En esta sección de Support podés:",
            "- Crear un nuevo ticket",
            "- Ver tus tickets abiertos",
            "- Revisar tickets pendientes",
        ],
        payments: [
            "En esta sección de Pagos podés:",
            "- Ver tu balance actual",
            "- Ver pagos pendientes",
            "- Ver historial de pagos",
            "- Reportar un pago",
        ],
        charges: [
            "En esta sección de Finanzas podés:",
            "- Ver tus cargos pendientes",
            "- Ver tu balance",
        ],
        communications: [
            "En Comunicaciones podés:",
            "- Ver comunicados del edificio",
            "- Revisar tu bandeja de entrada",
            "- Ver avisos importantes",
        ],
        documents: [
            "En Documentos podés:",
            "- Ver documentos del edificio",
            "- Revisar reglamentos",
            "- Buscar archivos",
        ],
        buildings: [
            "En Edificios podés:",
            "- Ver lista de edificios",
            "- Gestionar propiedades",
        ],
        units: [
            "En Unidades podés:",
            "- Ver unidades del edificio",
            "- Gestionar apartamentos",
        ],
    };
    const hintText = contextHints[contextModule];
    if (!hintText)
        return null;
    return hintText.join("\n");
}
function extractModuleFromRoute(route) {
    if (!route)
        return null;
    const routeLower = route.toLowerCase();
    if (routeLower.includes("/support") || routeLower.includes("/tickets"))
        return "tickets";
    if (routeLower.includes("/payments") || routeLower.includes("/finanzas"))
        return "payments";
    if (routeLower.includes("/charges"))
        return "charges";
    if (routeLower.includes("/communications") || routeLower.includes("/avisos") || routeLower.includes("/inbox"))
        return "communications";
    if (routeLower.includes("/documents") || routeLower.includes("/documentos"))
        return "documents";
    if (routeLower.includes("/buildings"))
        return "buildings";
    if (routeLower.includes("/units"))
        return "units";
    return null;
}
function formatContextualAnswer(baseAnswer, hint, question, hasActions) {
    const contextModule = hint.currentModule || extractModuleFromRoute(hint.currentRoute);
    if (!contextModule || contextModule === "general") {
        return baseAnswer;
    }
    const shortModuleNames = {
        tickets: "Support",
        payments: "Finanzas",
        charges: "Finanzas",
        communications: "Comunicaciones",
        documents: "Documentos",
        buildings: "Edificios",
        units: "Unidades",
    };
    const moduleName = shortModuleNames[contextModule];
    if (!moduleName)
        return baseAnswer;
    if (hasActions) {
        return `(${moduleName}) ${baseAnswer}`;
    }
    const contextualHint = getContextualFallback(hint, question);
    if (contextualHint) {
        return `${baseAnswer}\n\n${contextualHint}`;
    }
    return baseAnswer;
}
