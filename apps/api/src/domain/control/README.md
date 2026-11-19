# domain/control

`ControlComponent.js` — o maestro do padrão Blackboard (Bloco 6). Não conhece regras de TI:
só consulta `canExecute()` das Knowledge Sources, executa uma por iteração (a de menor índice
na lista) e repete até que nenhuma possa agir ou até `maxIterations` (padrão 10).
Não persiste nada; o resultado é salvo pelo caso de uso (Bloco 7).
