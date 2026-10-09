# EtiquetaFácil

Editor web de etiquetas de inventário, sem backend, organizado em DDD leve.

## Arquitetura

Contexto delimitado: criação de etiquetas térmicas. Linguagem do domínio: etiqueta, elemento, fita, milímetros e resolução de impressão.

- `src/domain/label.js`: agregado Label e objetos de valor Millimeters/PrintResolution. Validação e operações de configuração, inclusão, edição, remoção e movimento. Sem dependências de navegador.
- `src/application/label-editor.js`: casos de uso e portas injetadas para persistência e exportação.
- `src/infrastructure/`: adaptadores LocalStorage, Canvas e JPG/JFIF.
- `app.js`: composição das dependências e apresentação (DOM, seleção, arraste e calibração de tela).

A interface usa snapshots; não modifica o agregado diretamente. As dependências apontam para o domínio. Mantemos módulos JavaScript nativos, sem framework ou backend desnecessário. Dados antigos válidos do navegador são preservados; dados inválidos retornam ao modelo padrão.

## Testes

Com Node.js 22 ou superior, execute `npm test`. Execute `npm ci` antes dos testes (os testes de PDF usam os pacotes locais). Execute `npm run check` para validar a sintaxe da apresentação, domínio, aplicação, infraestrutura e testes. Runtime browser usa somente as distribuições vendorizadas.

## Rodar com Docker

Com Docker Desktop iniciado, execute nesta pasta:

```sh
docker compose up -d --build
```

Abra http://localhost:8080. Para parar: `docker compose down`. O serviço fica acessível somente nesta máquina.

## Modelos editáveis e exclusão

Escolha um modelo e clique em **Aplicar modelo**. Havendo conteúdo, confirme a substituição. As bases são Inventário padrão (58 × 35 mm), Compacto 20 mm (20 × 40 mm) e Patrimônio horizontal 58 mm (58 × 30 mm). O catálogo pertence ao domínio; a aplicação cria um agregado validado e preserva o lote sequencial e o DPI. Cada texto/código pode ser selecionado, alterado, movido ou excluído. Trocar somente o perfil de fita não aplica um modelo.

O modelo horizontal usa o placeholder textual **WADS.DEV** à esquerda, **Monitor / Responsável** ao centro, QR vazio opcional à direita e Code128 abaixo. Não inventa imagem de logo nem destino QR. O contorno “QR opcional” é mostrado somente na prévia; QR vazio não aparece nos arquivos exportados.

Para excluir, selecione um elemento no desenho ou no seletor **Elementos** e use **Excluir elemento selecionado**, junto à prévia, ou o botão original **Remover elemento** na sidebar. O nome/tipo selecionado aparece junto à prévia. Delete/Backspace funcionam apenas fora de input, textarea, select e conteúdo editável. **Limpar etiqueta** solicita confirmação e preserva medidas, lote e DPI. Após excluir o último elemento, adicione texto/imagem/código ou aplique uma base normalmente.

Uma foto/screenshot importada é uma única imagem: seus textos internos não viram elementos editáveis. Selecione **Imagem importada** e exclua a imagem para substituí-la por um modelo com elementos independentes.

## Usar

- Selecione fita de 20 mm, 58 mm ou largura personalizada. Ajuste altura, margem e resolução (203, 300 ou 600 DPI).
- Adicione textos e imagens, arraste elementos ou ajuste suas coordenadas em milímetros. Conteúdo fora da etiqueta será cortado: ajuste o layout ao trocar de fita.
- As alterações são salvas automaticamente no armazenamento local do navegador. Não há sincronização entre dispositivos. Imagens de até 2 MB.
- Para tamanho real, meça a barra de calibração com uma régua, informe a medida observada e clique em Calibrar tela. Recalibre ao trocar de monitor ou zoom.
- Exporte JPG. As guias e a seleção não aparecem no arquivo. O JPG inclui densidade JFIF em DPI e dimensões em pixels calculadas a partir dos milímetros.
- Imprima pelo software/driver da impressora, usando as medidas escolhidas, sem ajustar à página. A largura útil de uma impressora de 58 mm pode ser menor que 58 mm. Consulte o fabricante. A margem é uma guia visual, não um limitador de conteúdo.

## PDF vetorial e lotes

O botão Exportar PDF / lote gera um arquivo local com uma página por etiqueta, nas medidas exatas em mm (não A4). Texto Helvetica e retângulos Code128/QR permanecem vetoriais; somente logos são imagens raster. DPI afeta JPG, não os vetores PDF. Fontes PDF padrão cobrem português/Latin-1; outros alfabetos em texto comum exigiriam fonte embutida (não implementada). QR aceita UTF-8.

Em Conteúdo, adicione Code128 sequencial ou QR opcional; ambos têm posição e tamanho em mm e podem ser arrastados. QR vazio não é desenhado. O QR contém o campo livre, sem substituições automáticas. O Code128 contém prefixo + número do lote com zeros à esquerda e legenda legível. Textos comuns continuam estáticos.

Lote aceita início + quantidade ou início + fim inclusivo; até 500 etiquetas, inteiros não negativos seguros, prefixo ASCII imprimível até 24 caracteres e mínimo de 1–16 dígitos (números maiores não são truncados). QR até 500 bytes UTF-8. Prévia e JPG mostram apenas o primeiro identificador. Os controles persistem no navegador; projetos anteriores recebem configuração de lote padrão sem perder conteúdo.

Imprima PDF a 100%, sem ajustar à página. Ajuste o layout e preserve zonas brancas dos códigos; elementos fora da página são cortados e layouts muito pequenos podem não ser legíveis. Teste os códigos com o leitor real antes de imprimir um lote. Lotes máximos com QR/logos podem consumir memória; o gerador cede execução entre páginas.

Bibliotecas browser estão vendorizadas em src/infrastructure/vendor: jsPDF 4.2.1, JsBarcode 3.12.1 e qrcode-generator 2.0.4, com licenças MIT. Não há CDN em runtime. Para atualizar, use npm ci (ou npm install com versões explícitas), copie as respectivas distribuições browser e preserve licenças. npm audit é recomendado. npm test inclui geometria de códigos e PDF real (MediaBox e quantidade de páginas).

## Lote CSV (dados locais)

Selecione CSV, cole os dados e clique Aplicar CSV. Separadores ponto e vírgula, vírgula e tabulação: automático ou seleção explícita. Cabeçalho opcional; cada linha gera uma etiqueta. Linhas vazias são ignoradas; limite 500 etiquetas e 1 milhão de caracteres. Aspas escapadas "" e campos multiline LF/CRLF são aceitos. Identificadores permanecem texto, preservando zeros.

Variáveis {{coluna1}}, {{coluna2}} sempre disponíveis e nomes exatos {{equipamento}}, {{identificador}} quando houver cabeçalho. Misture texto e variáveis em texto, Code128 e QR. Selecione barcode no modo CSV para editar Conteúdo / template; sequencial continua automático. Cabeçalhos duplicados/vazios, colisões com colunaN e CSV malformado são rejeitados sem substituir dados válidos. Variável ausente e Code128 Unicode inválido bloqueiam exportação indicando linha física CSV. Code128 exige ASCII imprimível não vazio; QR aceita Unicode até 500 bytes UTF-8 por linha.

Painel mostra colunas, contagem, erros e navegação. JPG exporta linha selecionada; PDF todas as linhas, página por etiqueta e mesmas medidas mm. Modelo adicional Patrimônio horizontal CSV ativa o modo CSV e usa coluna1 como equipamento, coluna2 como número visível e coluna3 como conteúdo do código de barras e QR. Exemplo: Monitor do Leo;000001;WADS-TI-000001. Modelos antigos intactos. Dados/configuração CSV persistem localmente e projetos antigos continuam compatíveis. CSV vazio mantém edição disponível e export desabilitado.

Domínio parser/resolver/collection puro, DTOs materializados pela aplicação para preview/export pelas portas existentes. Testes cobrem quotes/multiline, zeros, atomicidade, navegação DOM, reload e PDF real mm.

Há conexão experimental Web Bluetooth para PD01 com serviço AE30 / canal AE01, baseada na documentação MIT de https://github.com/rhnvrm/catprinter. No Chrome do Mac, acesse localhost ou HTTPS, desconecte o Fun Print, permita Bluetooth e clique Conectar PD01 → Imprimir teste. O teste é um contorno com cruz em 384 pontos; não altera energia para máximo. Pacotes de até 20 bytes com intervalo de 20 ms e opção de interromper. Dados já enviados não podem ser cancelados. Envio concluído não confirma impressão física. Ainda não há impressão direta de etiquetas ou lotes nem leitura de status de papel/bateria; compatibilidade e largura dependem do teste na unidade real. A precisão final depende do driver, da área imprimível e da calibração da impressora. A fonte da interface usa fontes locais do sistema. O editor não envia o conteúdo das etiquetas a servidores.
