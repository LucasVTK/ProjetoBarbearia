// Driver de envio de WhatsApp.
//
// MODO ATUAL: simulado — registra a mensagem no console da API e finge
// sucesso. Toda a estrutura (templates, fila, lembrete 24h, registro no
// banco) já funciona de verdade; quando escolhermos o provedor real
// (Evolution API, Meta Cloud API ou Twilio), basta trocar o corpo desta
// função por uma chamada HTTP ao provedor.
export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  console.log(`\n📱 [WhatsApp simulado] → ${phone}\n${message}\n`)
}
