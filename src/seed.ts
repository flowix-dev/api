import "dotenv/config";
import mongoose from "mongoose";
import { NodeDefinition } from "./models/NodeDefinition";
import { NodeDataType } from "./types/NodeDataType";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/flowix";

const seedNodeDefinitions = [
  {
    name: "No Operation",
    fnKey: "noop",
    category: "utility",
    version: 1,
    scope: "workflow",
    inputs: [],
    outputs: [{ key: "result", type: NodeDataType.STRING, description: "Execution confirmation" }],
  },
  {
    name: "Delay",
    fnKey: "delay",
    category: "utility",
    version: 1,
    inputs: [
      {
        key: "delay",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        defaultValue: 1000,
        description: "Delay in milliseconds",
      },
    ],
    outputs: [
      { key: "delayed", type: NodeDataType.BOOLEAN, description: "Whether the delay was applied" },
      { key: "delayMs", type: NodeDataType.NUMBER, description: "Actual delay in milliseconds" },
    ],
  },
  {
    name: "Math Operation",
    fnKey: "math.operation",
    category: "math",
    version: 1,
    inputs: [
      {
        key: "a",
        type: NodeDataType.NUMBER,
        input: "number",
        required: true,
        defaultValue: 0,
        description: "Primer valor",
      },
      {
        key: "b",
        type: NodeDataType.NUMBER,
        input: "number",
        required: true,
        defaultValue: 0,
        description: "Segundo valor",
      },
      {
        key: "operation",
        type: NodeDataType.STRING,
        input: "select",
        options: ["suma", "resta", "multiplicacion", "division", "potencia", "raiz", "modulo"],
        required: false,
        defaultValue: "suma",
        description: "Operación a realizar (raiz = raíz a-ésima de b)",
      },
    ],
    outputs: [
      { key: "result", type: NodeDataType.NUMBER, description: "Resultado de la operación" },
    ],
  },
  {
    name: "HTTP Request",
    fnKey: "http.request",
    category: "actions",
    version: 1,
    inputs: [
      {
        key: "url",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Request URL",
      },
      {
        key: "method",
        type: NodeDataType.STRING,
        input: "select",
        options: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        required: false,
        defaultValue: "GET",
        description: "HTTP method (GET, POST, PUT, DELETE)",
      },
      {
        key: "headers",
        type: NodeDataType.OBJECT,
        input: "none",
        required: false,
        description: "Request headers as JSON object",
      },
      {
        key: "body",
        type: NodeDataType.ANY,
        input: "none",
        required: false,
        description: "Request body",
      },
    ],
    outputs: [
      { key: "status", type: NodeDataType.NUMBER, description: "HTTP status code" },
      { key: "data", type: NodeDataType.ANY, description: "Response body" },
      { key: "headers", type: NodeDataType.OBJECT, description: "Response headers" },
    ],
  },
  {
    name: "AI Chat",
    fnKey: "ai.chat",
    category: "ai",
    version: 1,

    inputs: [
      {
        key: "model",
        type: NodeDataType.STRING,
        input: "select",
        options: [
          "gpt-5-nano",
          "gpt-5.4-nano",
          "gpt-5.5",
          "claude-sonnet-4-6",
          "claude-opus-4-8",
          "gemini-3.1-flash-lite",
          "gemini-3.1-flash",
          "openai/gpt-5.3-chat",
          "reka/reka-edge",
        ],
        required: false,
        defaultValue: "gpt-5-nano",
        description: "Modelo a usar (requiere Puter conectado)",
      },
      {
        key: "system",
        type: NodeDataType.STRING,
        input: "textarea",
        required: false,
        description: "Prompt de sistema opcional",
      },
      {
        key: "messages",
        type: NodeDataType.JSON,
        input: "textarea",
        required: true,
        description: 'Mensajes JSON, ej: [{"role":"user","content":"hola"}]',
      },
      {
        key: "temperature",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        defaultValue: 0.7,
        description: "Temperatura (0-2)",
      },
      {
        key: "maxTokens",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        defaultValue: 2048,
        description: "Máximo de tokens en la respuesta",
      },
    ],
    outputs: [
      { key: "response", type: NodeDataType.STRING, description: "Respuesta generada" },
      { key: "model", type: NodeDataType.STRING, description: "Modelo usado" },
    ],
  },
  {
    name: "AI Assistant",
    fnKey: "ai.assistant",
    category: "ai",
    version: 1,

    inputs: [
      {
        key: "assistantId",
        type: NodeDataType.STRING,
        input: "select",
        options: [],
        required: true,
        description: "Asistente a usar (los de la sección Asistentes)",
      },
      {
        key: "prompt",
        type: NodeDataType.STRING,
        input: "textarea",
        required: true,
        description: "Prompt a enviar al asistente",
      },
    ],
    outputs: [
      { key: "response", type: NodeDataType.STRING, description: "Respuesta del asistente" },
      { key: "assistantName", type: NodeDataType.STRING, description: "Nombre del asistente" },
      { key: "model", type: NodeDataType.STRING, description: "Modelo usado" },
    ],
  },
  {
    name: "Gmail Send Email",
    fnKey: "gmail.send",
    category: "email",
    version: 1,
    inputs: [
      {
        key: "credentials",
        type: NodeDataType.CREDENTIALS,
        input: "credentials",
        required: true,
        description: "Conectá tu cuenta de Gmail",
      },
      {
        key: "to",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Recipient email",
      },
      {
        key: "subject",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Email subject",
      },
      {
        key: "body",
        type: NodeDataType.STRING,
        input: "textarea",
        required: true,
        description: "Email body (plain text)",
      },
    ],
    outputs: [
      { key: "messageId", type: NodeDataType.STRING, description: "Message ID from Gmail" },
    ],
  },
  {
    name: "Outlook Send Email",
    fnKey: "outlook.send",
    category: "email",
    version: 1,

    inputs: [
      {
        key: "credentials",
        type: NodeDataType.CREDENTIALS,
        input: "credentials",
        required: true,
        description: "Conectá tu cuenta de Outlook",
      },
      {
        key: "to",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Recipient email",
      },
      {
        key: "subject",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Email subject",
      },
      {
        key: "body",
        type: NodeDataType.STRING,
        input: "textarea",
        required: true,
        description: "Email body (plain text)",
      },
    ],
    outputs: [
      { key: "messageId", type: NodeDataType.STRING, description: "Message ID from Outlook" },
    ],
  },
  {
    name: "Stringify Object",
    fnKey: "json.stringify",
    category: "data",
    version: 1,

    inputs: [
      {
        key: "value",
        type: NodeDataType.ANY,
        input: "none",
        required: true,
        description: "Objeto o dato a convertir",
      },
    ],
    outputs: [
      { key: "text", type: NodeDataType.STRING, description: "Objeto serializado como texto" },
    ],
  },
  {
    name: "Parse Object",
    fnKey: "json.parse",
    category: "data",
    version: 1,

    inputs: [
      {
        key: "text",
        type: NodeDataType.STRING,
        input: "textarea",
        required: true,
        description: "Texto JSON a parsear",
      },
    ],
    outputs: [{ key: "value", type: NodeDataType.ANY, description: "Valor parseado" }],
  },
  {
    name: "Get Value From Object",
    fnKey: "json.get",
    category: "data",
    version: 1,

    inputs: [
      {
        key: "object",
        type: NodeDataType.OBJECT,
        input: "none",
        required: true,
        description: "Objeto de origen",
      },
      {
        key: "key",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Clave a leer",
      },
    ],
    outputs: [{ key: "value", type: NodeDataType.ANY, description: "Valor de la clave" }],
  },
  {
    name: "Get Array Element",
    fnKey: "array.get",
    category: "data",
    version: 1,

    inputs: [
      {
        key: "array",
        type: NodeDataType.ANY_ARRAY,
        input: "none",
        required: true,
        description: "Array o string (se trata como array de caracteres)",
      },
      {
        key: "index",
        type: NodeDataType.NUMBER,
        input: "number",
        required: true,
        defaultValue: 0,
        description: "Índice del elemento a obtener",
      },
    ],
    outputs: [
      { key: "value", type: NodeDataType.ANY, description: "Elemento en la posición index" },
    ],
  },
  {
    name: "Array Aggregate",
    fnKey: "array.aggregate",
    category: "data",
    version: 1,

    inputs: [
      {
        key: "array",
        type: NodeDataType.NUMBER_ARRAY,
        input: "none",
        required: true,
        description: "Array de números a procesar",
      },
      {
        key: "operation",
        type: NodeDataType.STRING,
        input: "select",
        options: ["sum", "avg", "max", "min"],
        required: false,
        defaultValue: "sum",
        description: "Operación a aplicar sobre el array",
      },
    ],
    outputs: [
      { key: "result", type: NodeDataType.NUMBER, description: "Resultado de la operación" },
    ],
  },
  {
    name: "Array Length",
    fnKey: "array.length",
    category: "data",
    version: 1,

    inputs: [
      {
        key: "value",
        type: NodeDataType.ANY_ARRAY,
        input: "none",
        required: true,
        description: "Array o string a medir",
      },
    ],
    outputs: [{ key: "length", type: NodeDataType.NUMBER, description: "Cantidad de elementos" }],
  },
  {
    name: "Array Operations",
    fnKey: "array.operations",
    category: "data",
    version: 1,

    inputs: [
      {
        key: "array",
        type: NodeDataType.ANY_ARRAY,
        input: "none",
        required: true,
        description: "Array o string a operar",
      },
      {
        key: "operation",
        type: NodeDataType.STRING,
        input: "select",
        options: ["push", "join", "filter", "map", "concat", "slice"],
        required: false,
        defaultValue: "push",
        description: "Operación a aplicar",
      },
      {
        key: "value",
        type: NodeDataType.ANY_ARRAY,
        input: "none",
        required: false,
        description: "Elemento a agregar (push) u otro array (concat)",
      },
      {
        key: "separator",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        defaultValue: "",
        description: "Separador para join",
      },
      {
        key: "start",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        defaultValue: 0,
        description: "Índice inicial para slice",
      },
      {
        key: "end",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        description: "Índice final para slice (opcional)",
      },
      {
        key: "expression",
        type: NodeDataType.STRING,
        input: "textarea",
        required: false,
        description: "Expresión JS para filter/map. Variables: item, index, array. Ej: item > 5",
      },
    ],
    outputs: [{ key: "result", type: NodeDataType.ANY, description: "Resultado (array o string)" }],
  },
  {
    name: "Text Operations",
    fnKey: "text.operations",
    category: "data",
    version: 1,

    inputs: [
      {
        key: "text",
        type: NodeDataType.STRING,
        input: "textarea",
        required: true,
        description: "Texto a procesar",
      },
      {
        key: "operation",
        type: NodeDataType.STRING,
        input: "select",
        options: ["split", "replace", "slice", "upper", "lower", "trim"],
        required: false,
        defaultValue: "trim",
        description: "Operación a aplicar",
      },
      {
        key: "separator",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        defaultValue: ",",
        description: "Separador para split",
      },
      {
        key: "search",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        description: "Texto a buscar para replace",
      },
      {
        key: "replacement",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        defaultValue: "",
        description: "Texto de reemplazo (todas las ocurrencias)",
      },
      {
        key: "start",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        defaultValue: 0,
        description: "Índice inicial para slice",
      },
      {
        key: "end",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        description: "Índice final para slice (opcional)",
      },
    ],
    outputs: [{ key: "result", type: NodeDataType.ANY, description: "Resultado (string o array)" }],
  },
  {
    name: "If/Else",
    fnKey: "if.else",
    category: "logic",
    version: 1,
    scope: "workflow",
    inputs: [
      {
        key: "value1",
        type: NodeDataType.ANY,
        input: "none",
        required: true,
        description: "Primer valor a comparar",
      },
      {
        key: "value2",
        type: NodeDataType.ANY,
        input: "none",
        required: true,
        description: "Segundo valor a comparar",
      },
      {
        key: "operation",
        type: NodeDataType.STRING,
        input: "select",
        options: ["=", ">", "<", ">=", "<="],
        required: false,
        defaultValue: "=",
        description: "Operación de comparación",
      },
    ],
    outputs: [
      {
        key: "true",
        type: NodeDataType.ANY,
        description: "Salida cuando la condición es verdadera",
      },
      { key: "false", type: NodeDataType.ANY, description: "Salida cuando la condición es falsa" },
    ],
  },
  {
    name: "OR Gate",
    fnKey: "or.gate",
    category: "logic",
    version: 1,
    scope: "workflow",
    activationMode: "any",
    inputs: [
      {
        key: "input1",
        type: NodeDataType.ANY,
        input: "none",
        required: false,
        description: "Primera entrada (se activa con cualquiera)",
      },
      {
        key: "input2",
        type: NodeDataType.ANY,
        input: "none",
        required: false,
        description: "Segunda entrada",
      },
      {
        key: "input3",
        type: NodeDataType.ANY,
        input: "none",
        required: false,
        description: "Tercera entrada",
      },
      {
        key: "input4",
        type: NodeDataType.ANY,
        input: "none",
        required: false,
        description: "Cuarta entrada",
      },
    ],
    outputs: [
      {
        key: "value",
        type: NodeDataType.ANY,
        description: "Dato de la primera entrada que recibe datos",
      },
    ],
  },
  {
    name: "Switch",
    fnKey: "switch",
    category: "logic",
    version: 1,
    scope: "workflow",
    inputs: [
      {
        key: "value",
        type: NodeDataType.ANY,
        input: "none",
        required: true,
        description: "Valor a evaluar",
      },
      {
        key: "cases",
        type: NodeDataType.STRING,
        input: "textarea",
        required: false,
        defaultValue: "",
        description:
          'Casos separados por coma. Usá comillas (simples o dobles) para incluir comas u otras comillas, ej: activo, pendiente, "en espera"',
      },
    ],
    outputs: [
      {
        key: "value",
        type: NodeDataType.ANY,
        description: "Dato de la primera entrada que recibe datos",
      },
    ],
  },
  {
    name: "Return/End",
    fnKey: "return.end",
    category: "logic",
    version: 1,
    scope: "workflow",
    inputs: [
      {
        key: "value",
        type: NodeDataType.ANY,
        input: "none",
        required: false,
        description: "Valor a devolver como resultado del workflow",
      },
    ],
    outputs: [],
  },
  {
    name: "Try/Catch",
    fnKey: "try.catch",
    category: "logic",
    version: 1,
    scope: "workflow",
    inputs: [
      {
        key: "value",
        type: NodeDataType.ANY,
        input: "none",
        required: false,
        description: "Valor a pasar al bloque try",
      },
    ],
    outputs: [
      {
        key: "try",
        type: NodeDataType.ANY,
        description: "Se activa cuando comienza el bloque try",
      },
      {
        key: "catch",
        type: NodeDataType.ANY,
        description: "Se activa si algún nodo del bloque try falla, con el error",
      },
    ],
  },
  {
    name: "File Upload",
    fnKey: "file.upload",
    category: "files",
    version: 1,

    inputs: [
      {
        key: "file",
        type: NodeDataType.FILE,
        input: "file",
        required: true,
        description: "Archivo a subir (se elige al ejecutar)",
      },
    ],
    outputs: [
      { key: "url", type: NodeDataType.STRING, description: "URL del archivo subido" },
      { key: "key", type: NodeDataType.STRING, description: "Clave S3 del archivo" },
      { key: "name", type: NodeDataType.STRING, description: "Nombre original del archivo" },
      { key: "size", type: NodeDataType.NUMBER, description: "Tamaño en bytes" },
      { key: "type", type: NodeDataType.STRING, description: "Tipo MIME" },
    ],
  },
  {
    name: "File Parser",
    fnKey: "file.parser",
    category: "files",
    version: 1,

    inputs: [
      {
        key: "url",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "URL del archivo (salida de File Upload)",
      },
    ],
    outputs: [
      { key: "text", type: NodeDataType.STRING, description: "Contenido extraído" },
      { key: "format", type: NodeDataType.STRING, description: "Formato detectado" },
      { key: "rows", type: NodeDataType.ANY_ARRAY, description: "Filas parseadas (csv/xlsx)" },
    ],
  },
  {
    name: "Template",
    fnKey: "template.render",
    category: "data",
    version: 1,

    inputs: [
      {
        key: "template",
        type: NodeDataType.STRING,
        input: "textarea",
        required: true,
        description: "Texto con placeholders {{clave}} o {{a.b}}",
      },
      {
        key: "values",
        type: NodeDataType.OBJECT,
        input: "textarea",
        required: false,
        defaultValue: "{}",
        description: "Objeto con los valores (JSON)",
      },
    ],
    outputs: [{ key: "text", type: NodeDataType.STRING, description: "Template renderizado" }],
  },
  {
    name: "Object Operations",
    fnKey: "object.operations",
    category: "data",
    version: 1,

    inputs: [
      {
        key: "mode",
        type: NodeDataType.STRING,
        input: "select",
        options: ["merge", "set"],
        required: false,
        defaultValue: "merge",
        description: "merge: combinar objetos · set: asignar una clave",
      },
      {
        key: "object1",
        type: NodeDataType.OBJECT,
        input: "textarea",
        required: false,
        description: "Primer objeto para merge (JSON)",
      },
      {
        key: "object2",
        type: NodeDataType.OBJECT,
        input: "textarea",
        required: false,
        description: "Segundo objeto para merge (JSON, gana en conflicto)",
      },
      {
        key: "object",
        type: NodeDataType.OBJECT,
        input: "textarea",
        required: false,
        description: "Objeto base para set (JSON)",
      },
      {
        key: "key",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        description: "Clave a asignar (set)",
      },
      {
        key: "value",
        type: NodeDataType.ANY,
        input: "none",
        required: false,
        description: "Valor a asignar (set)",
      },
    ],
    outputs: [{ key: "result", type: NodeDataType.OBJECT, description: "Objeto resultante" }],
  },
  {
    name: "Slack Send Message",
    fnKey: "slack.send",
    category: "notifications",
    version: 1,

    inputs: [
      {
        key: "webhookUrl",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "URL del Incoming Webhook de Slack",
      },
      {
        key: "text",
        type: NodeDataType.STRING,
        input: "textarea",
        required: true,
        description: "Mensaje a enviar",
      },
      {
        key: "channel",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        description: "Canal opcional (#general)",
      },
    ],
    outputs: [
      { key: "status", type: NodeDataType.NUMBER, description: "Código HTTP" },
      { key: "data", type: NodeDataType.ANY, description: "Respuesta" },
    ],
  },
  {
    name: "Discord Send Message",
    fnKey: "discord.send",
    category: "notifications",
    version: 1,

    inputs: [
      {
        key: "webhookUrl",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "URL del Webhook de Discord",
      },
      {
        key: "text",
        type: NodeDataType.STRING,
        input: "textarea",
        required: true,
        description: "Mensaje a enviar",
      },
      {
        key: "username",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        description: "Nombre de usuario opcional",
      },
    ],
    outputs: [
      { key: "status", type: NodeDataType.NUMBER, description: "Código HTTP" },
      { key: "data", type: NodeDataType.ANY, description: "Respuesta" },
    ],
  },
  {
    name: "Telegram Send Message",
    fnKey: "telegram.send",
    category: "notifications",
    version: 1,

    inputs: [
      {
        key: "botToken",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Token del bot (de @BotFather)",
      },
      {
        key: "chatId",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "ID del chat (usuario o grupo)",
      },
      {
        key: "text",
        type: NodeDataType.STRING,
        input: "textarea",
        required: true,
        description: "Mensaje a enviar",
      },
      {
        key: "parseMode",
        type: NodeDataType.STRING,
        input: "select",
        options: ["", "HTML", "Markdown"],
        required: false,
        defaultValue: "",
        description: "Formato del mensaje",
      },
    ],
    outputs: [
      { key: "status", type: NodeDataType.NUMBER, description: "Código HTTP" },
      { key: "data", type: NodeDataType.ANY, description: "Respuesta" },
    ],
  },
  {
    name: "Airtable List Records",
    fnKey: "airtable.list",
    category: "integrations",
    version: 1,

    inputs: [
      {
        key: "token",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Personal Access Token de Airtable",
      },
      {
        key: "baseId",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "ID de la base",
      },
      {
        key: "tableName",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Nombre de la tabla",
      },
      {
        key: "limit",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        defaultValue: 100,
        description: "Máximo de registros",
      },
      {
        key: "view",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        description: "Vista opcional",
      },
    ],
    outputs: [
      { key: "status", type: NodeDataType.NUMBER, description: "Código HTTP" },
      { key: "records", type: NodeDataType.ANY_ARRAY, description: "Registros crudos" },
      { key: "rows", type: NodeDataType.ANY_ARRAY, description: "Filas (id + campos)" },
    ],
  },
  {
    name: "Airtable Append Record",
    fnKey: "airtable.append",
    category: "integrations",
    version: 1,

    inputs: [
      {
        key: "token",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Personal Access Token de Airtable",
      },
      {
        key: "baseId",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "ID de la base",
      },
      {
        key: "tableName",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Nombre de la tabla",
      },
      {
        key: "fields",
        type: NodeDataType.OBJECT,
        input: "textarea",
        required: true,
        description: "Campos del registro (JSON)",
      },
    ],
    outputs: [
      { key: "status", type: NodeDataType.NUMBER, description: "Código HTTP" },
      { key: "data", type: NodeDataType.ANY, description: "Respuesta" },
    ],
  },
  {
    name: "Notion Create Page",
    fnKey: "notion.createPage",
    category: "integrations",
    version: 1,

    inputs: [
      {
        key: "token",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Integration Token de Notion",
      },
      {
        key: "databaseId",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "ID de la base de datos",
      },
      {
        key: "properties",
        type: NodeDataType.OBJECT,
        input: "textarea",
        required: true,
        description: "Propiedades de la página (JSON, según el schema de la base)",
      },
      {
        key: "children",
        type: NodeDataType.JSON,
        input: "textarea",
        required: false,
        description: "Bloques hijos opcionales (JSON array)",
      },
    ],
    outputs: [
      { key: "status", type: NodeDataType.NUMBER, description: "Código HTTP" },
      { key: "id", type: NodeDataType.STRING, description: "ID de la página" },
      { key: "url", type: NodeDataType.STRING, description: "URL de la página" },
      { key: "page", type: NodeDataType.OBJECT, description: "Página completa" },
    ],
  },
  {
    name: "Google Sheets",
    fnKey: "google.sheets",
    category: "integrations",
    version: 1,

    inputs: [
      {
        key: "credentials",
        type: NodeDataType.CREDENTIALS,
        input: "credentials",
        required: true,
        description: "Conectá tu cuenta de Google",
      },
      {
        key: "operation",
        type: NodeDataType.STRING,
        input: "select",
        options: ["append", "read", "list", "update"],
        required: false,
        defaultValue: "append",
        description:
          "append: agregar filas · read: leer rango · list: listar hojas · update: escribir rango",
      },
      {
        key: "spreadsheetId",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "ID del spreadsheet (de la URL)",
      },
      {
        key: "sheetName",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        defaultValue: "Sheet1",
        description: "Nombre de la hoja",
      },
      {
        key: "values",
        type: NodeDataType.JSON,
        input: "textarea",
        required: false,
        description: 'Filas a agregar (JSON array de arrays), ej: [["a",1],["b",2]]',
      },
      {
        key: "range",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        defaultValue: "A1",
        description: "Rango a leer (read)",
      },
    ],
    outputs: [
      { key: "result", type: NodeDataType.ANY, description: "Respuesta" },
      { key: "values", type: NodeDataType.ANY_ARRAY, description: "Valores leídos (read)" },
    ],
  },
  {
    name: "Google Docs",
    fnKey: "google.docs",
    category: "integrations",
    version: 1,

    inputs: [
      {
        key: "credentials",
        type: NodeDataType.CREDENTIALS,
        input: "credentials",
        required: true,
        description: "Conectá tu cuenta de Google",
      },
      {
        key: "operation",
        type: NodeDataType.STRING,
        input: "select",
        options: ["create", "list", "read", "update"],
        required: false,
        defaultValue: "create",
        description: "create: crear · list: listar · read: leer · update: reemplazar texto",
      },
      {
        key: "title",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        description: "Título del documento (create)",
      },
      {
        key: "content",
        type: NodeDataType.STRING,
        input: "textarea",
        required: false,
        description: "Contenido del documento (create, texto plano)",
      },
      {
        key: "documentId",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        description: "ID del documento (read/update)",
      },
      {
        key: "find",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        description: "Texto a reemplazar (update)",
      },
      {
        key: "replacement",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        defaultValue: "",
        description: "Texto de reemplazo (update, todas las ocurrencias)",
      },
    ],
    outputs: [
      { key: "documentId", type: NodeDataType.STRING, description: "ID del documento" },
      { key: "url", type: NodeDataType.STRING, description: "URL del documento" },
      { key: "files", type: NodeDataType.ANY_ARRAY, description: "Lista de documentos (list)" },
      { key: "text", type: NodeDataType.STRING, description: "Texto extraído (read)" },
      {
        key: "occurrencesReplaced",
        type: NodeDataType.NUMBER,
        description: "Ocurrencias reemplazadas (update)",
      },
    ],
  },
  {
    name: "Google Slides",
    fnKey: "google.slides",
    category: "integrations",
    version: 1,

    inputs: [
      {
        key: "credentials",
        type: NodeDataType.CREDENTIALS,
        input: "credentials",
        required: true,
        description: "Conectá tu cuenta de Google",
      },
      {
        key: "operation",
        type: NodeDataType.STRING,
        input: "select",
        options: ["create", "list", "read", "update"],
        required: false,
        defaultValue: "create",
        description: "create: crear · list: listar · read: leer · update: agregar diapositiva",
      },
      {
        key: "title",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        description: "Título (create) o título de la nueva diapositiva (update)",
      },
      {
        key: "presentationId",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        description: "ID de la presentación (read/update)",
      },
    ],
    outputs: [
      { key: "presentationId", type: NodeDataType.STRING, description: "ID de la presentación" },
      { key: "url", type: NodeDataType.STRING, description: "URL de la presentación" },
      { key: "files", type: NodeDataType.ANY_ARRAY, description: "Lista de presentaciones (list)" },
      { key: "slides", type: NodeDataType.ANY_ARRAY, description: "Diapositivas (read)" },
      {
        key: "slideCount",
        type: NodeDataType.NUMBER,
        description: "Cantidad de diapositivas (read)",
      },
      {
        key: "slideId",
        type: NodeDataType.STRING,
        description: "ID de la nueva diapositiva (update)",
      },
    ],
  },
  {
    name: "Mongo Query",
    fnKey: "mongo.query",
    category: "database",
    version: 1,

    inputs: [
      {
        key: "collection",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Nombre de la colección",
      },
      {
        key: "operation",
        type: NodeDataType.STRING,
        input: "select",
        options: ["find", "insertOne", "updateOne", "deleteOne", "count"],
        required: false,
        defaultValue: "find",
        description: "Operación",
      },
      {
        key: "query",
        type: NodeDataType.JSON,
        input: "textarea",
        required: false,
        defaultValue: "{}",
        description: "Filtro (JSON)",
      },
      {
        key: "data",
        type: NodeDataType.JSON,
        input: "textarea",
        required: false,
        description: "Documento o update (JSON) para insertOne/updateOne",
      },
      {
        key: "limit",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        defaultValue: 100,
        description: "Máximo de documentos (find)",
      },
    ],
    outputs: [{ key: "result", type: NodeDataType.ANY, description: "Resultado de la operación" }],
  },
  {
    name: "Postgres Query",
    fnKey: "postgres.query",
    category: "database",
    version: 1,

    inputs: [
      {
        key: "connectionString",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "postgres://usuario:pass@host:puerto/db",
      },
      {
        key: "query",
        type: NodeDataType.STRING,
        input: "textarea",
        required: true,
        description: "Consulta SQL",
      },
      {
        key: "params",
        type: NodeDataType.JSON,
        input: "textarea",
        required: false,
        description: "Parámetros (JSON array) para $1, $2…",
      },
    ],
    outputs: [
      { key: "rows", type: NodeDataType.ANY_ARRAY, description: "Filas resultantes" },
      { key: "rowCount", type: NodeDataType.NUMBER, description: "Cantidad de filas" },
      { key: "fields", type: NodeDataType.ANY_ARRAY, description: "Campos" },
    ],
  },
  {
    name: "MySQL Query",
    fnKey: "mysql.query",
    category: "database",
    version: 1,

    inputs: [
      {
        key: "connectionString",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "mysql://usuario:pass@host:puerto/db",
      },
      {
        key: "query",
        type: NodeDataType.STRING,
        input: "textarea",
        required: true,
        description: "Consulta SQL",
      },
      {
        key: "params",
        type: NodeDataType.JSON,
        input: "textarea",
        required: false,
        description: "Parámetros (JSON array) para ?",
      },
    ],
    outputs: [{ key: "result", type: NodeDataType.ANY, description: "Resultado" }],
  },
  {
    name: "Webhook Trigger",
    fnKey: "webhook.trigger",
    category: "triggers",
    version: 1,
    scope: "workflow",
    inputs: [],
    outputs: [
      {
        key: "data",
        type: NodeDataType.ANY,
        description: "Payload del webhook (POST /api/webhooks/:id)",
      },
    ],
  },
  {
    name: "Schedule Trigger",
    fnKey: "schedule.trigger",
    category: "triggers",
    version: 1,
    scope: "workflow",
    inputs: [
      {
        key: "intervalSeconds",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        defaultValue: 60,
        description: "Cada cuántos segundos se ejecuta",
      },
    ],
    outputs: [
      { key: "timestamp", type: NodeDataType.STRING, description: "Marca de tiempo ISO" },
      { key: "now", type: NodeDataType.NUMBER, description: "Timestamp en ms" },
    ],
  },
  {
    name: "Slack Trigger",
    fnKey: "slack.trigger",
    category: "triggers",
    version: 1,
    scope: "workflow",
    inputs: [],
    outputs: [
      { key: "channel", type: NodeDataType.STRING, description: "Canal de donde vino el mensaje" },
      { key: "user", type: NodeDataType.STRING, description: "Usuario que envió el mensaje" },
      { key: "text", type: NodeDataType.STRING, description: "Contenido del mensaje" },
      { key: "team", type: NodeDataType.STRING, description: "Workspace de Slack" },
      { key: "timestamp", type: NodeDataType.STRING, description: "Timestamp del mensaje" },
    ],
  },
  {
    name: "Discord Trigger",
    fnKey: "discord.trigger",
    category: "triggers",
    version: 1,
    scope: "workflow",
    inputs: [],
    outputs: [
      { key: "channelId", type: NodeDataType.STRING, description: "ID del canal" },
      { key: "author", type: NodeDataType.STRING, description: "Usuario que envió el mensaje" },
      { key: "content", type: NodeDataType.STRING, description: "Contenido del mensaje" },
      { key: "guildId", type: NodeDataType.STRING, description: "ID del servidor" },
      { key: "timestamp", type: NodeDataType.STRING, description: "Timestamp del mensaje" },
    ],
  },
  {
    name: "Gmail Trigger",
    fnKey: "gmail.trigger",
    category: "triggers",
    version: 1,
    scope: "workflow",
    inputs: [
      {
        key: "credentials",
        type: NodeDataType.CREDENTIALS,
        input: "credentials",
        required: true,
        description: "Conectá tu cuenta de Gmail",
      },
    ],
    outputs: [
      { key: "from", type: NodeDataType.STRING, description: "Email del remitente" },
      { key: "subject", type: NodeDataType.STRING, description: "Asunto del email" },
      { key: "body", type: NodeDataType.STRING, description: "Contenido del email" },
      { key: "date", type: NodeDataType.STRING, description: "Fecha de recepción" },
      { key: "attachments", type: NodeDataType.ANY_ARRAY, description: "Archivos adjuntos" },
    ],
  },
  {
    name: "Outlook Trigger",
    fnKey: "outlook.trigger",
    category: "triggers",
    version: 1,
    scope: "workflow",
    inputs: [
      {
        key: "credentials",
        type: NodeDataType.CREDENTIALS,
        input: "credentials",
        required: true,
        description: "Conectá tu cuenta de Outlook",
      },
    ],
    outputs: [
      { key: "from", type: NodeDataType.STRING, description: "Email del remitente" },
      { key: "subject", type: NodeDataType.STRING, description: "Asunto del email" },
      { key: "body", type: NodeDataType.STRING, description: "Contenido del email" },
      { key: "date", type: NodeDataType.STRING, description: "Fecha de recepción" },
      { key: "attachments", type: NodeDataType.ANY_ARRAY, description: "Archivos adjuntos" },
    ],
  },
  {
    name: "WhatsApp Send Message",
    fnKey: "whatsapp.send",
    category: "notifications",
    version: 1,
    inputs: [
      {
        key: "phoneNumberId",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Phone Number ID (de Meta Business)",
      },
      {
        key: "accessToken",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Access Token de WhatsApp Business API",
      },
      {
        key: "to",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Número de teléfono del destinatario (con código de país)",
      },
      {
        key: "text",
        type: NodeDataType.STRING,
        input: "textarea",
        required: true,
        description: "Mensaje a enviar",
      },
    ],
    outputs: [
      { key: "status", type: NodeDataType.NUMBER, description: "Código HTTP" },
      { key: "messageId", type: NodeDataType.STRING, description: "ID del mensaje enviado" },
      { key: "data", type: NodeDataType.ANY, description: "Respuesta completa" },
    ],
  },
  {
    name: "WhatsApp Trigger",
    fnKey: "whatsapp.trigger",
    category: "triggers",
    version: 1,
    scope: "workflow",
    inputs: [],
    outputs: [
      { key: "from", type: NodeDataType.STRING, description: "Número del remitente" },
      { key: "name", type: NodeDataType.STRING, description: "Nombre del remitente" },
      { key: "text", type: NodeDataType.STRING, description: "Contenido del mensaje" },
      { key: "messageId", type: NodeDataType.STRING, description: "ID del mensaje" },
      { key: "timestamp", type: NodeDataType.STRING, description: "Timestamp del mensaje" },
    ],
  },
  {
    name: "Run Workflow",
    fnKey: "run.workflow",
    category: "flow",
    version: 1,
    scope: "all",
    inputs: [
      {
        key: "workflowId",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "ID del workflow hijo (doble click para abrirlo)",
      },
      {
        key: "inputCount",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        defaultValue: 1,
        description: "Cantidad de inputs",
      },
      {
        key: "outputCount",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        defaultValue: 1,
        description: "Cantidad de outputs",
      },
    ],
    outputs: [],
  },
  {
    name: "Get Inputs",
    fnKey: "get.inputs",
    category: "flow",
    version: 1,
    scope: "workflow",
    inputs: [
      {
        key: "count",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        defaultValue: 1,
        description: "Cantidad de inputs que recibe del padre",
      },
    ],
    outputs: [],
  },
  {
    name: "Send Outputs",
    fnKey: "send.outputs",
    category: "flow",
    version: 1,
    scope: "workflow",
    inputs: [
      {
        key: "count",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        defaultValue: 1,
        description: "Cantidad de outputs a enviar al padre",
      },
    ],
    outputs: [],
  },
  {
    name: "Create Workflow",
    fnKey: "create.workflow",
    category: "flow",
    version: 1,
    inputs: [
      {
        key: "name",
        type: NodeDataType.STRING,
        input: "text",
        required: true,
        description: "Nombre del nuevo workflow",
      },
      {
        key: "nodes",
        type: NodeDataType.JSON,
        input: "textarea",
        required: false,
        description:
          "Nodos del workflow (JSON array) — opcional, crea un workflow vacío si se omite",
      },
      {
        key: "edges",
        type: NodeDataType.JSON,
        input: "textarea",
        required: false,
        description: "Conexiones del workflow (JSON array) — opcional",
      },
    ],
    outputs: [
      { key: "id", type: NodeDataType.STRING, description: "ID del workflow creado" },
      { key: "url", type: NodeDataType.STRING, description: "URL para abrir el workflow" },
      { key: "name", type: NodeDataType.STRING, description: "Nombre del workflow creado" },
    ],
  },
  {
    name: "List Workflows",
    fnKey: "list.workflows",
    category: "flow",
    version: 1,
    inputs: [
      {
        key: "search",
        type: NodeDataType.STRING,
        input: "text",
        required: false,
        description: "Busca workflows por nombre (opcional)",
      },
      {
        key: "limit",
        type: NodeDataType.NUMBER,
        input: "number",
        required: false,
        defaultValue: 50,
        description: "Máximo de resultados (1-200, default 50)",
      },
      {
        key: "includeChildren",
        type: NodeDataType.BOOLEAN,
        input: "none",
        required: false,
        defaultValue: false,
        description: "Si true, incluye workflows hijos (sub-workflows)",
      },
    ],
    outputs: [
      {
        key: "workflows",
        type: NodeDataType.ANY_ARRAY,
        description:
          "Lista de workflows (workflowId, name, parentWorkflowId, updatedAt, createdAt)",
      },
      { key: "count", type: NodeDataType.NUMBER, description: "Cantidad de resultados" },
    ],
  },
];

async function seed(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    for (const def of seedNodeDefinitions) {
      const updated = await NodeDefinition.findOneAndUpdate(
        { fnKey: def.fnKey },
        { $set: def },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      console.log(
        `  Upserted "${updated.name}" (fnKey: ${updated.fnKey}, scope: ${updated.scope})`
      );
    }

    const seedFnKeys = seedNodeDefinitions.map((def) => def.fnKey);
    const removed = await NodeDefinition.deleteMany({
      fnKey: { $nin: seedFnKeys },
    });
    if (removed.deletedCount > 0) {
      console.log(`  Removed ${removed.deletedCount} obsolete definitions`);
    }

    console.log("\nSeed completed successfully");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
