# État de l'espace de travail

Au 3 novembre 2026, `/` et `/app` affichent une interface de conversation avec création, historique et suppression de discussions. L'envoi utilise `@google/genai` et l'historique enregistré ; les erreurs sont affichées et le texte reste dans le champ. La voix et le compagnon restent accessibles dans `/voice`.

La base utilisée au lancement normal est persistante ; les tests utilisent une base en mémoire. Le parcours de conversation accepte les images et PDF dans les limites indiquées dans l'interface et affiche les réponses Markdown. L'historique permet de rechercher dans les titres et messages, épingler et renommer les discussions. Les citations restent à réaliser. Les anciens écrans de référence et leurs captures ne prouvent pas que ces fonctionnalités sont présentes.
