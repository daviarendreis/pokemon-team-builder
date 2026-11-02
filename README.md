# Montador de Time Pokémon

Monte um time de até 6 Pokémon com dados da [PokéAPI](https://pokeapi.co/) e veja a quais tipos
de ataque ele está exposto. Feito com React, TypeScript e Vite.

## Como rodar

```sh
npm install
npm run dev     # servidor de desenvolvimento
npm test        # testes
npm run build   # checagem de tipos e build de produção
```

## Como as fraquezas são calculadas

Para cada um dos 18 tipos de ataque, o multiplicador contra um Pokémon é o produto das relações
de dano dos seus tipos (`/type/{nome}`): ×2, ×0,5 ou ×0. O Pokémon conta como fraco se o resultado
for maior que 1. Habilidades como Levitate e itens não entram no cálculo.

A lógica está em `src/domain/weakness.ts`, sem dependência de React.
