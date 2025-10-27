/**
 * Utilitários de Paginação
 * Centraliza lógica de paginação para evitar duplicação
 */

/**
 * Calcula offset para paginação
 * @param {number} pagina - Número da página (1-based)
 * @param {number} limite - Número de itens por página
 * @returns {number} Offset calculado
 */
function calcularOffset(pagina, limite) {
  const paginaValida = Math.max(1, parseInt(pagina) || 1);
  const limiteValido = Math.max(1, parseInt(limite) || 10);
  return (paginaValida - 1) * limiteValido;
}

/**
 * Valida e normaliza parâmetros de paginação
 * @param {number|string} pagina - Número da página
 * @param {number|string} limite - Limite de itens por página
 * @param {number} maxLimite - Limite máximo permitido (padrão: 100)
 * @returns {object} Objeto com página, limite e offset validados
 */
function validarParametrosPaginacao(pagina, limite, maxLimite = 100) {
  const paginaValida = Math.max(1, parseInt(pagina) || 1);
  const limiteValido = Math.min(maxLimite, Math.max(1, parseInt(limite) || 10));
  const offset = calcularOffset(paginaValida, limiteValido);
  
  return {
    pagina: paginaValida,
    limite: limiteValido,
    offset
  };
}

/**
 * Cria objeto de resposta paginada
 * @param {Array} dados - Array de dados
 * @param {number} total - Total de registros
 * @param {number} pagina - Página atual
 * @param {number} limite - Limite por página
 * @returns {object} Objeto de resposta paginada
 */
function criarRespostaPaginada(dados, total, pagina, limite) {
  const totalPaginas = Math.ceil(total / limite);
  
  return {
    dados,
    paginacao: {
      paginaAtual: pagina,
      totalPaginas,
      totalRegistros: total,
      itensPorPagina: limite,
      temProximaPagina: pagina < totalPaginas,
      temPaginaAnterior: pagina > 1
    }
  };
}

module.exports = {
  calcularOffset,
  validarParametrosPaginacao,
  criarRespostaPaginada
};