import { Pd01Printer } from './pd01-printer.js';
export function mountPrinterUi({document, window, bluetooth=globalThis.navigator?.bluetooth, secure=globalThis.isSecureContext !== false}) {
 const $=id=>document.getElementById(id);
 const status=text=>{$('printerStatus').textContent=text;};
 const printer=new Pd01Printer({bluetooth,onChange:text=>{status(text);controls();}});
 function controls(){ $('printerConnect').disabled=printer.busy; $('printerTest').disabled=printer.busy||!printer.connected; $('printerDisconnect').disabled=!printer.connected; $('printerCancel').disabled=!printer.busy||!printer.connected; }
 async function action(run){try{const pending=run();controls();await pending;}catch(error){status(error.name==='NotFoundError'?'Seleção cancelada ou PD01 não encontrada. Ligue a impressora e desconecte o Fun Print.':error.name==='SecurityError'?'Acesso Bluetooth bloqueado. Abra diretamente no Chrome em localhost ou HTTPS, fora de prévias/iframes.':error.name==='NotAllowedError'?'Permissão Bluetooth negada. Confira Chrome em Ajustes do Sistema → Privacidade e Segurança → Bluetooth.':error.message);}finally{controls();}}
 $('printerConnect').onclick=()=>{status('Clique recebido. Abrindo seletor Bluetooth do Chrome…');return action(()=>{if(!secure)throw Error('Página sem contexto seguro. Abra http://localhost:8080 no Chrome do Mac.');return printer.connect();});};
 $('printerTest').onclick=()=>{if(window.confirm('Enviar um teste pequeno à PD01? Confira papel e tampa.'))return action(()=>printer.printTest(percent=>status('Enviando teste: '+percent+'%')));};
 $('printerCancel').onclick=()=>{printer.cancel();status('Interrompendo envio; dados já recebidos podem continuar imprimindo.');};
 $('printerDisconnect').onclick=()=>{printer.disconnect();status('Impressora desconectada.');controls();};
 controls();
 status(!secure?'Abra http://localhost:8080 no Chrome: esta página não permite Bluetooth.':!bluetooth?'Web Bluetooth indisponível neste navegador. Use Google Chrome no Mac, não Safari.':'Bluetooth disponível. Clique Conectar PD01; permita acesso no Chrome e no macOS.');
 return printer;
}
