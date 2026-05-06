(() => {
  const SYSTEM_PROMPT = [
    "Você NÃO pode inventar cálculos.",
    "Você NÃO pode calcular ou recalcular valores.",
    "Use apenas os dados enviados.",
    "Nunca altere os resultados do solver.",
    "Nunca sugira produtos inexistentes.",
    "Nunca invente nutrientes ou produtos fora do cadastro.",
    "Não use internet ou conhecimento externo; limite-se ao contexto enviado.",
    "Se faltarem dados, informe explicitamente.",
    "Resposta curta, técnica e objetiva.",
    "Você apenas explica, justifica, resume e compara cenários com os números já calculados."
  ].join(" ");

  const MODEL = "deepseek/deepseek-chat-v3-0324:free";
  const DEFAULT_API_KEY = "";

  const explain = async ({ apiKey, solverSnapshot, knowledgeText }) => {
    const effectiveApiKey = apiKey || DEFAULT_API_KEY;
    if (!effectiveApiKey) {
      return { ok: false, text: "Configure a chave OpenRouter para gerar explicação contextual." };
    }

    const body = {
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Base de conhecimento (somente referencia):\n${knowledgeText}\n\nResultado do solver (fonte unica de numeros):\n${solverSnapshot}\n\nExplique tecnicamente o resultado em linguagem objetiva. Nao recalcule.`
        }
      ],
      temperature: 0.2,
      max_tokens: 260
    };

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveApiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        return { ok: false, text: `Falha OpenRouter: HTTP ${response.status}` };
      }

      const json = await response.json();
      const text = json?.choices?.[0]?.message?.content?.trim();
      if (!text) return { ok: false, text: "Resposta vazia da IA." };

      return { ok: true, text };
    } catch {
      return { ok: false, text: "Falha de rede ao consultar OpenRouter." };
    }
  };

  window.OpenRouterAI = {
    explain,
    SYSTEM_PROMPT
  };
})();
