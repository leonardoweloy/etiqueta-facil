// Protocol reference: https://github.com/rhnvrm/catprinter (MIT).
export const PD01_SERVICE = '0000ae30-0000-1000-8000-00805f9b34fb';
export function frame(command, data = []) {
  let crc = 0;
  for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ ((crc & 128) ? 7 : 0)) & 255; }
  return Uint8Array.from([0x51, 0x78, command, 0, data.length & 255, data.length >> 8, ...data, crc, 255]);
}
export function testFrames() {
  const start = [0xaa,0x55,0x17,0x38,0x44,0x5f,0x5f,0x5f,0x44,0x38,0x2c];
  const frames = [frame(0xa3,[0]),frame(0xa4,[0x32]),frame(0xa6,start)];
  // Sparse calibration pattern: outline, central cross, no solid heating block.
  for(let y=0;y<96;y++) {
    const row = new Uint8Array(48);
    for(let x=16;x<368;x++) if(y===8||y===87||x===16||x===367||(y===48&&x>160&&x<224)||(x===192&&y>24&&y<72)) row[x>>3] |= 1 << (x%8);
    frames.push(frame(0xa2,row));
  }
  frames.push(frame(0xbd,[40]),frame(0xa1,[0x30,0]),frame(0xa6,[0xaa,0x55,0x17,0,0,0,0,0,0,0,0x17]),frame(0xa3,[0]));
  return frames;
}
export class Pd01Printer {
  constructor({bluetooth=globalThis.navigator?.bluetooth, delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)), onChange=()=>{}}={}) { this.bluetooth=bluetooth;this.delay=delay;this.onChange=onChange;this.busy=false; }
  get connected(){return Boolean(this.device?.gatt?.connected && this.tx);}
  async connect(){
    if(this.busy) throw Error('Operação Bluetooth em andamento.');
    if(!this.bluetooth) throw Error('Bluetooth indisponível. Use Chrome no Mac em localhost ou HTTPS e permita Bluetooth nos Ajustes.');
    this.busy=true;
    try {
      this.disconnect();
      this.device=await this.bluetooth.requestDevice({filters:[{namePrefix:'PD01'},{services:[PD01_SERVICE]}],optionalServices:[PD01_SERVICE]});
      this.device.addEventListener('gattserverdisconnected',()=>{this.tx=null;this.cancelled=true;this.onChange('Impressora desconectada.');});
      this.onChange('Dispositivo selecionado. Conectando via Bluetooth…');
      const server=await this.device.gatt.connect();
      const service=await server.getPrimaryService(PD01_SERVICE);
      this.tx=await service.getCharacteristic('0000ae01-0000-1000-8000-00805f9b34fb');
      if(!this.tx.properties.writeWithoutResponse) throw Error('Canal AE01 incompatível com o protocolo PD01.');
      this.onChange('Conectada: '+(this.device.name||'PD01')+'. Compatibilidade física ainda precisa do teste.');
    } catch(error){this.disconnect();throw error;} finally{this.busy=false;}
  }
  disconnect(){this.cancelled=true;this.tx=null;this.device?.gatt?.disconnect();}
  cancel(){this.cancelled=true;}
  async printTest(onProgress=()=>{}){
    if(this.busy) throw Error('Operação Bluetooth em andamento.');
    if(!this.connected) throw Error('Conecte a PD01 primeiro.');
    this.busy=true;this.cancelled=false;
    try{
      const frames=testFrames();
      for(let i=0;i<frames.length;i++){
        const bytes=frames[i];
        for(let offset=0;offset<bytes.length;offset+=20){
          if(this.cancelled) throw Error('Envio interrompido. Dados já enviados podem continuar imprimindo.');
          if(!this.connected) throw Error('Conexão Bluetooth perdida. Não reenvie automaticamente.');
          await this.tx.writeValueWithoutResponse(bytes.slice(offset,offset+20));
          await this.delay(20);
        }
        onProgress(Math.round((i+1)/frames.length*100));
      }
      this.onChange('Teste enviado — confirme no papel. O envio não confirma impressão concluída.');
    }finally{this.busy=false;}
  }
}
