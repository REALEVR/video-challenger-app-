const junoBar = document.querySelector('#junoBar');
const junoPercent = document.querySelector('#junoPercent');
const solPercent = document.querySelector('#solPercent');
const voteTotal = document.querySelector('#voteTotal');
const voteStatus = document.querySelector('#voteStatus');
const voteButtons = document.querySelectorAll('[data-vote]');
let junoVotes = 11274;
let solVotes = 7218;

voteButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selected = button.dataset.vote;
    document.querySelectorAll('.vote-button').forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
    if (selected === 'juno') junoVotes += 1;
    else solVotes += 1;
    const total = junoVotes + solVotes;
    const junoShare = Math.round((junoVotes / total) * 100);
    junoBar.style.width = `${junoShare}%`;
    junoPercent.textContent = `${junoShare}%`;
    solPercent.textContent = `${100 - junoShare}%`;
    voteTotal.textContent = `${total.toLocaleString()} votes`;
    voteStatus.textContent = `You voted for ${selected === 'juno' ? 'Juno Miles' : 'Sol Reyes'}. Thanks for weighing in.`;
  });
});

document.querySelectorAll('.filter-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach((item) => item.classList.remove('active'));
    tab.classList.add('active');
    const category = tab.textContent;
    document.querySelectorAll('.challenge-card').forEach((card) => {
      card.style.display = category === 'All' || card.dataset.category === category ? '' : 'none';
    });
  });
});

const searchInput = document.querySelector('#searchInput');
searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase().trim();
  document.querySelectorAll('.challenge-card').forEach((card) => {
    card.style.display = card.textContent.toLowerCase().includes(query) ? '' : 'none';
  });
});

const modal = document.querySelector('#uploadModal');
const openModal = () => { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); };
const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); };
document.querySelector('#openUpload').addEventListener('click', openModal);
document.querySelector('#openUploadBottom').addEventListener('click', openModal);
document.querySelector('#closeUpload').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
document.querySelector('#videoFile').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) event.target.closest('.drop-zone').querySelector('strong').textContent = file.name;
});
document.querySelector('#publishButton').addEventListener('click', () => {
  document.querySelector('#publishButton').innerHTML = 'Challenge ready <span>✓</span>';
  setTimeout(closeModal, 700);
});
