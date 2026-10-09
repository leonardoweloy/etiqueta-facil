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

Com Node.js 22 ou superior, execute `npm test`. Não é necessário instalar dependências. Execute `npm run check` para validar a sintaxe da entrada da interface.

## Rodar com Docker

Com Docker Desktop iniciado, execute nesta pasta:

```sh
docker compose up -d --build
```

Abra http://localhost:8080. Para parar: `docker compose down`. O serviço fica acessível somente nesta máquina.

## Usar

- Selecione fita de 20 mm, 58 mm ou largura personalizada. Ajuste altura, margem e resolução (203, 300 ou 600 DPI).
- Adicione textos e imagens, arraste elementos ou ajuste suas coordenadas em milímetros. Conteúdo fora da etiqueta será cortado: ajuste o layout ao trocar de fita.
- As alterações são salvas automaticamente no armazenamento local do navegador. Não há sincronização entre dispositivos. Imagens de até 2 MB.
- Para tamanho real, meça a barra de calibração com uma régua, informe a medida observada e clique em Calibrar tela. Recalibre ao trocar de monitor ou zoom.
- Exporte JPG. As guias e a seleção não aparecem no arquivo. O JPG inclui densidade JFIF em DPI e dimensões em pixels calculadas a partir dos milímetros.
- Imprima pelo software/driver da impressora, usando as medidas escolhidas, sem ajustar à página. A largura útil de uma impressora de 58 mm pode ser menor que 58 mm. Consulte o fabricante. A margem é uma guia visual, não um limitador de conteúdo.

Não há envio direto à impressora. A precisão final depende do driver, da área imprimível e da calibração da impressora. A fonte da interface pode carregar do Google Fonts; sem internet utiliza Arial. O editor não envia o conteúdo das etiquetas a servidores.
