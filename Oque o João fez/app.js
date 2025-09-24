        document.addEventListener('DOMContentLoaded', function() {
            // Botão para solicitar edição dos dados pessoais
            document.getElementById('solicitar-edicao').addEventListener('click', function() {
                alert('Solicitação de edição enviada! Entre em contato com o suporte para alterar seus dados cadastrais.');
            });
            
            // Botão para exportar dados
            document.getElementById('exportar-dados').addEventListener('click', function() {
                alert('Exportando dados pessoais... Em uma implementação real, isso baixaria um arquivo com suas informações.');
            });
            
            // Botões de edição (apenas exemplos)
            document.getElementById('edit-vehicle-info').addEventListener('click', function() {
                alert('Abrindo modal de edição de informações do veículo...');
            });
            
            document.getElementById('edit-comfort-items').addEventListener('click', function() {
                alert('Abrindo modal de edição de itens de conforto...');
            });
        });