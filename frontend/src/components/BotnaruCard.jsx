const BOT = ({ children }) => (
  <strong style={{ color: '#a78bfa', fontWeight: 700 }}>{children}</strong>
);

export default function BotnaruCard() {
  return (
    <div
      className="card p-6 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6"
      style={{ borderLeft: '4px solid #a78bfa' }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 flex justify-center">
        <img
          src="/botnaru.png"
          alt="Botnaru"
          className="w-32 h-32 md:w-40 md:h-40 rounded-full shadow-md object-cover object-top"
          style={{ border: '4px solid #a78bfa' }}
        />
      </div>

      {/* Texte */}
      <div className="flex flex-col gap-3 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
          <h3 className="text-xl md:text-2xl font-black leading-snug" style={{ color: 'var(--text)' }}>
            Mais qui est <BOT>Botnaru</BOT>, l'IA qui vous aide à vous dépasser&nbsp;?
          </h3>
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
            background: 'rgba(167,139,250,0.18)', color: '#a78bfa',
            border: '1px solid rgba(167,139,250,0.4)', letterSpacing: '.04em', flexShrink: 0,
          }}>
            IA
          </span>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <BOT>Botnaru</BOT> est une intelligence artificielle développée par nos soins, et elle
          n'est pas comme les autres. En effet, celle-ci, en plus d'être la première IA moldave,
          est une très grande fan de football.
        </p>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Sauriez-vous reconnaître du premier coup d'œil le maillot du FC Portsmouth, obscur club
          de D3 anglaise&nbsp;? Probablement non, mais <BOT>Botnaru</BOT>, si. Connaissez-vous les
          effectifs des 15 dernières saisons du FC Nantes&nbsp;? <BOT>Botnaru</BOT>, oui.
        </p>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Vous l'aurez compris, notre IA connaît une passion débordante pour le football.
          L'association de celle-ci avec des méthodes statistiques extrêêêêêêment poussées fait
          d'elle l'experte et la concurrente absolue.
        </p>

        <p className="text-sm font-bold" style={{ color: '#a78bfa' }}>
          À vous de tenter de la battre&nbsp;!
        </p>
      </div>
    </div>
  );
}
