'use strict';
// VessieLang Tokens
export const KEYWORDS = new Set(['var','func','if','else','while','for','return','import','export','try','catch','finally','class','extends','new','true','false','null','undefined','break','continue','in']);

export const SYMBOLS = new Map([
  ['{','lbrace'],['}','rbrace'],['(','lparen'],[')','rparen'],
  ['[','lbracket'],[']','rbracket'],[',','comma'],[';',';'],['.', '.'],['+','plus'],['-','minus'],['*','star'],['/','slash'],['%','percent'],['<','lt'],['>','gt'],['=','eq'],['!','bang'],
  ['==','eqeq'],['!=','neq'],['<=','lte'],['>=','gte'],['&&','ampamp'],['||','pipip'],['++','inc'],['--','dec'],['+=','addeq'],['-=','subeq'],['*=','muleq'],['/=','diveq'],['=>','arrow'],['?','ternary'],[':',':']
]);

export function classify(token) {
  if (KEYWORDS.has(token.value)) token.type = 'keyword';
  return token;
}
