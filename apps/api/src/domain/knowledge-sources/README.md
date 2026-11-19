# domain/knowledge-sources

- `KnowledgeSource.js`: classe base abstrata, com `canExecute(blackboard)` e `execute(blackboard)`.
- `KS1_Hardware`, `KS2_Network`, `KS3_OperatingSystem`, `KS4_Software`, `KS5_Security` (Bloco 5):
  especialistas independentes que analisam por palavras-chave o `description` e o `equipment` do
  incidente e escrevem hipóteses e evidências no Blackboard. Nunca se comunicam entre si.
- `shared/keywordAnalysis.js`: funções puras de análise de texto usadas pelas cinco KS.
- `index.js`: exporta a base e as cinco KS (o Control Component do Bloco 6 vai consumir daqui).
