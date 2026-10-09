import { Pd01Printer } from './pd01-printer.js';
import { renderRaster } from './pd01-raster.js';
export function mountPrinterUi({document, window, bluetooth=globalThis.navigator?.bluetooth, secure=globalThis.isSecureContext !== false}) {
 const $=id=>document.getElementById(id);
 const status=text=>{$('printerStatus').textContent=text;};
 const printer=new Pd01Printer({bluetooth,onChange:text=>{status(text);controls();}});
 function controls(){ $('printerConnect').disabled=printer.busy; $('printerTest').disabled=printer.busy||!printer.connected; $('printerDisconnect').disabled=!printer.connected; $('printerCancel').disabled=!printer.busy||!printer.connected; for(const id of ['printerCurrent','printerBatch']) if($(id)) $(id).disabled=printer.busy||!printer.connected; }
 async function action(run){try{const pending=run();controls();await pending;}catch(error){status(error.name==='NotFoundError'?'Seleção cancelada ou PD01 não encontrada. Ligue a impressora e desconecte o Fun Print.':error.name==='SecurityError'?'Acesso Bluetooth bloqueado. Abra diretamente no Chrome em localhost ou HTTPS, fora de prévias/iframes.':error.name==='NotAllowedError'?'Permissão Bluetooth negada. Confira Chrome em Ajustes do Sistema → Privacidade e Segurança → Bluetooth.':error.message);}finally{controls();}}
 $('printerConnect').onclick=()=>{status('Clique recebido. Abrindo seletor Bluetooth do Chrome…');return action(()=>{if(!secure)throw Error('Página sem contexto seguro. Abra http://localhost:8080 no Chrome do Mac.');return printer.connect();});};
 $('printerTest').onclick=()=>{if(window.confirm('Enviar um teste pequeno à PD01? Confira papel e tampa.'))return action(()=>printer.printTest(percent=>status('Enviando teste: '+percent+'%')));};
 async function labels(all){return action(async()=>{
   if(!window.etiquetaPrinterSource)throw Error('Editor ainda não carregou. Recarregue a página.');
   const labels=window.etiquetaPrinterSource(all);
   if(!window.confirm('Imprimir '+labels.length+' etiqueta(s) na PD01? Limite 20 por envio. Larguras acima de ~48,8 mm serão reduzidas proporcionalmente. Valide uma etiqueta e a leitura dos códigos antes do lote.'))return;
   return printer.printLabels(labels, label=>renderRaster(label,document), progress=>status(progress.phase==='prepare'?'Preparando '+progress.index+'/'+progress.total+'…':'Enviando etiqueta '+progress.index+'/'+progress.total+': '+progress.percent+'%'));
 });}
 if($('printerCurrent'))$('printerCurrent').onclick=()=>labels(false);
 if($('printerBatch'))$('printerBatch').onclick=()=>labels(true);
 $('printerCancel').onclick=()=>{printer.cancel();status('Interrompendo envio; dados já recebidos podem continuar imprimindo.');};
 $('printerDisconnect').onclick=()=>{printer.disconnect();status('Impressora desconectada.');controls();};
 controls();
 status(!secure?'Abra http://localhost:8080 no Chrome: esta página não permite Bluetooth.':!bluetooth?'Web Bluetooth indisponível neste navegador. Use Google Chrome no Mac, não Safari.':'Bluetooth disponível. Clique Conectar PD01; permita acesso no Chrome e no macOS.');
 return printer;
}
