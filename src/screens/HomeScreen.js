import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Linking,
    Modal, RefreshControl,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet, Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../lib/supabase';

const TYPEBOT_URL = 'https://typebot.co/my-typebot-quqw854';

export default function HomeScreen() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  
  // Favoritos
  const [favorites, setFavorites] = useState([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Filtros Rápidos
  const [showOnlyPromos, setShowOnlyPromos] = useState(false);
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [showOnlyBenefits, setShowOnlyBenefits] = useState(false);

  // Roteiros Prontos (Dicas Trip)
  const itineraries = [
    {
      id: 'sp-1-dia',
      title: 'São Paulo LGBT+ em 1 Dia 🏙️',
      description: 'Passeio cultural matutino na Paulista, almoço no Arouche e noite na Frei Caneca.',
      duration: '1 Dia completo',
      stops: ['Avenida Paulista', 'Largo do Arouche', 'Rua Frei Caneca'],
    },
    {
      id: 'sp-festas',
      title: 'Final de Semana das Festas 🪩',
      description: 'Guia definitivo para quem quer curtir festas de quinta a domingo em SP.',
      duration: 'Sexta a Domingo',
      stops: ['Bar da Dona Onça', 'Augusta', 'Festas Pop/Eletrônico'],
    },
    {
      id: 'sp-casais',
      title: 'São Paulo Romântica para Casais 🍷',
      description: 'Restaurantes acolhedores, bistrôs charmosos e passeios ao ar livre para curtir a dois.',
      duration: '2 Dias',
      stops: ['Parque Ibirapuera', 'Pinheiros', 'Jardins'],
    }
  ];

  useEffect(() => {
    fetchBusinesses();
  }, []);

  async function fetchBusinesses() {
    try {
      const { data, error } = await supabase.from('businesses').select('*');
      if (error) throw error;
      setBusinesses(data || []);
    } catch (err) {
      console.log('Erro ao buscar dados:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchBusinesses();
  };

  const toggleFavorite = (id) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(favId => favId !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const shareBusiness = async (item) => {
    if (!item) return;
    try {
      await Share.share({
        message: `🌈 Olha essa dica no Dicas LGBT APP!\n\n📍 *${item.name}*\n${item.category ? `🏷️ ${item.category.toUpperCase()}\n` : ''}${item.neighborhood ? `🏙️ ${item.neighborhood}\n` : ''}${item.benefit ? `🎁 Benefício Exclusivo: ${item.benefit}\n` : ''}${item.current_promo ? `🔥 Promoção: ${item.current_promo}\n` : ''}\nDescubra os melhores lugares com o Dicas LGBT!`,
      });
    } catch (error) {
      console.log('Erro ao compartilhar:', error.message);
    }
  };

  const requestLeadInfo = (itemTitle) => {
    const text = encodeURIComponent(`Olá! Tenho interesse no roteiro/destino "${itemTitle}" do Dicas Trip ✈️`);
    Linking.openURL(`https://wa.me/5511999999999?text=${text}`);
  };

  const openMaps = (address) => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const openWhatsApp = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent('Olá! Vi o seu local no Dicas LGBT e gostaria de mais informações 🌈')}`;
    Linking.openURL(url);
  };

  const openInstagram = (handle) => {
    if (!handle) return;
    const cleanHandle = handle.replace('@', '');
    const url = `https://instagram.com/${cleanHandle}`;
    Linking.openURL(url);
  };

  // Lógica de Filtros Combinados
  const filteredBusinesses = businesses.filter((b) => {
    const matchesCategory = !selectedCategory || b.category?.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch = !searchQuery || 
      b.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.neighborhood?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorites = !showOnlyFavorites || favorites.includes(b.id);
    const matchesPromos = !showOnlyPromos || (b.current_promo && b.current_promo.trim() !== '');
    const matchesOpen = !showOnlyOpen || b.is_open === true;
    const matchesBenefits = !showOnlyBenefits || (b.benefit && b.benefit.trim() !== '');

    return matchesCategory && matchesSearch && matchesFavorites && matchesPromos && matchesOpen && matchesBenefits;
  });

  const premiumPlaces = filteredBusinesses.filter(b => b.plan === 'ouro' || b.plan === 'divina');
  const eventsAndParties = filteredBusinesses.filter(b => b.category?.toLowerCase() === 'festa' || b.category?.toLowerCase() === 'evento');
  const tripDestinations = filteredBusinesses.filter(b => b.category?.toLowerCase() === 'hospedagem' || b.category?.toLowerCase() === 'turismo');

  const categories = [
    { id: 'bar', icon: '🍻', label: 'Bares' },
    { id: 'restaurante', icon: '🍽️', label: 'Restaurantes' },
    { id: 'festa', icon: '🪩', label: 'Festas' },
    { id: 'hospedagem', icon: '🛌', label: 'Hotéis' },
    { id: 'turismo', icon: '🗺️', label: 'Passeios' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header com Identidade Neon */}
      <View style={styles.header}>
        <View style={styles.brandBox}>
          <Text style={styles.brandTitle}>DICAS LGBT</Text>
          <Text style={styles.brandSubtitle}>APP</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.sloganText}>Descubra. Viva. Conecte-se.</Text>
        </View>
        <TouchableOpacity 
          style={[styles.favFilterBtn, showOnlyFavorites && styles.favFilterBtnActive]}
          onPress={() => setShowOnlyFavorites(!showOnlyFavorites)}
        >
          <Text style={styles.favFilterBtnText}>
            {showOnlyFavorites ? '❤️ Todos' : `❤️ (${favorites.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EC4899" />}
      >
        {/* Campo de Busca */}
        <View style={styles.searchSection}>
          <TextInput 
            placeholder="Buscar por nome, bairro ou cidade..." 
            placeholderTextColor="#64748B"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filtros Rápidos */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickFiltersScroll}>
          <TouchableOpacity 
            style={[styles.quickChip, showOnlyBenefits && styles.quickChipActive]}
            onPress={() => setShowOnlyBenefits(!showOnlyBenefits)}
          >
            <Text style={[styles.quickChipText, showOnlyBenefits && styles.quickChipTextActive]}>
              🎁 Com Benefício
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickChip, showOnlyPromos && styles.quickChipActive]}
            onPress={() => setShowOnlyPromos(!showOnlyPromos)}
          >
            <Text style={[styles.quickChipText, showOnlyPromos && styles.quickChipTextActive]}>
              🔥 Só Promoções
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickChip, showOnlyOpen && styles.quickChipActive]}
            onPress={() => setShowOnlyOpen(!showOnlyOpen)}
          >
            <Text style={[styles.quickChipText, showOnlyOpen && styles.quickChipTextActive]}>
              🟢 Aberto Agora
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Categorias */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((cat) => (
            <TouchableOpacity 
              key={cat.id} 
              style={[
                styles.categoryItem, 
                selectedCategory === cat.id && styles.categoryItemActive
              ]}
              onPress={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
            >
              <Text style={[
                styles.categoryIcon,
                selectedCategory === cat.id && styles.categoryIconActive
              ]}>{cat.icon}</Text>
              <Text style={[
                styles.categoryLabel,
                selectedCategory === cat.id && styles.categoryLabelActive
              ]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color="#EC4899" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ROTEIROS DICAS TRIP */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Roteiros Dicas Trip 🗺️</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {itineraries.map((it) => (
                  <TouchableOpacity 
                    key={it.id} 
                    style={styles.itineraryCard} 
                    onPress={() => setSelectedItinerary(it)}
                  >
                    <Text style={styles.itineraryBadge}>{it.duration}</Text>
                    <Text style={styles.itineraryTitle}>{it.title}</Text>
                    <Text style={styles.itinerarySub} numberOfLines={2}>{it.description}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* SEÇÃO 1: EM DESTAQUE */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Em Destaque 🌟</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {premiumPlaces.length > 0 ? premiumPlaces.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.highlightCard} onPress={() => setSelectedBusiness(item)}>
                    <TouchableOpacity 
                      style={styles.heartBtn} 
                      onPress={() => toggleFavorite(item.id)}
                    >
                      <Text style={{fontSize: 16}}>{favorites.includes(item.id) ? '❤️' : '🤍'}</Text>
                    </TouchableOpacity>

                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.cardImage} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Text style={{color: '#475569', fontSize: 24}}>🌈</Text>
                      </View>
                    )}
                    
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                      {item.plan === 'divina' && <Text style={styles.verifiedBadge}>✔</Text>}
                    </View>
                    
                    <Text style={styles.cardSub}>{item.neighborhood || 'Localização'}</Text>
                    
                    {item.benefit && (
                      <View style={styles.benefitBadge}>
                        <Text style={styles.benefitText}>🎁 {item.benefit}</Text>
                      </View>
                    )}

                    {item.current_promo && (
                      <View style={styles.promoBadge}>
                        <Text style={styles.promoText}>🔥 {item.current_promo}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )) : (
                  <Text style={styles.emptyTextHorizontal}>Nenhum local encontrado.</Text>
                )}
              </ScrollView>
            </View>

            {/* SEÇÃO 2: HOTÉIS E PASSEIOS */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Hotéis e Passeios ✈️</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {tripDestinations.length > 0 ? tripDestinations.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.tripCard} onPress={() => setSelectedBusiness(item)}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSub}>Hospedagem & Passeios</Text>
                  </TouchableOpacity>
                )) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>Hotéis parceiros em breve...</Text>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* SEÇÃO 3: AGENDA E FESTAS */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Agenda e Festas 🪩</Text>
              </View>
              {eventsAndParties.length > 0 ? eventsAndParties.map((item) => (
                <TouchableOpacity key={item.id} style={styles.listCard} onPress={() => setSelectedBusiness(item)}>
                  <View style={styles.cardInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      {item.plan === 'divina' && <Text style={styles.verifiedBadge}>✔</Text>}
                    </View>
                    <Text style={styles.cardSub}>📍 {item.neighborhood || 'Bairro'}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.heartListBtn} 
                    onPress={() => toggleFavorite(item.id)}
                  >
                    <Text style={{fontSize: 18}}>{favorites.includes(item.id) ? '❤️' : '🤍'}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )) : (
                <Text style={styles.emptyText}>Nenhum evento encontrado.</Text>
              )}
            </View>

            {/* Banner para Empresas */}
            <TouchableOpacity style={styles.businessBanner} onPress={() => Linking.openURL(TYPEBOT_URL)}>
              <Text style={styles.businessBannerTitle}>É dono de um estabelecimento?</Text>
              <Text style={styles.businessBannerSub}>Clique aqui para cadastrar seu local no app.</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={{height: 40}} />
      </ScrollView>

      {/* Modal Roteiro Dicas Trip */}
      <Modal visible={!!selectedItinerary} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedItinerary?.title}</Text>
            <Text style={styles.modalText}>⏱️ Duração: {selectedItinerary?.duration}</Text>
            <Text style={styles.modalText}>📝 {selectedItinerary?.description}</Text>

            <View style={{marginVertical: 12}}>
              <Text style={{color: '#38BDF8', fontWeight: 'bold', marginBottom: 6}}>Paradas sugeridas:</Text>
              {selectedItinerary?.stops.map((stop, idx) => (
                <Text key={idx} style={{color: '#CBD5E1', fontSize: 13, marginBottom: 2}}>• {stop}</Text>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.actionBtn, {backgroundColor: '#EC4899', marginTop: 10}]}
              onPress={() => requestLeadInfo(selectedItinerary?.title)}
            >
              <Text style={styles.actionBtnText}>📩 Tenho Interesse / Personalizar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedItinerary(null)}>
              <Text style={styles.closeBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Detalhes do Local */}
      <Modal visible={!!selectedBusiness} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                <Text style={styles.modalTitle}>{selectedBusiness?.name}</Text>
                {selectedBusiness?.plan === 'divina' && (
                  <Text style={[styles.verifiedBadge, {marginLeft: 6}]}>✔ Verificado</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => selectedBusiness && toggleFavorite(selectedBusiness.id)}>
                <Text style={{fontSize: 24}}>
                  {selectedBusiness && favorites.includes(selectedBusiness.id) ? '❤️' : '🤍'}
                </Text>
              </TouchableOpacity>
            </View>

            {selectedBusiness?.image_url && (
              <Image source={{ uri: selectedBusiness.image_url }} style={styles.modalImage} />
            )}
            
            <Text style={styles.modalText}>📍 Endereço: {selectedBusiness?.address || 'Não informado'}</Text>
            <Text style={styles.modalText}>🏙️ Bairro: {selectedBusiness?.neighborhood || 'Não informado'}</Text>
            <Text style={styles.modalText}>🏷️ Categoria: {selectedBusiness?.category?.toUpperCase() || 'Geral'}</Text>

            {selectedBusiness?.benefit && (
              <View style={styles.benefitBoxModal}>
                <Text style={styles.benefitBoxTitle}>🎁 Benefício Exclusivo no App:</Text>
                <Text style={styles.benefitBoxText}>{selectedBusiness.benefit}</Text>
              </View>
            )}

            {selectedBusiness?.current_promo && (
              <View style={styles.promoBadgeModal}>
                <Text style={styles.promoText}>🔥 Promoção Ativa: {selectedBusiness.current_promo}</Text>
              </View>
            )}
            
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.shareBtn]} 
                onPress={() => shareBusiness(selectedBusiness)}
              >
                <Text style={styles.actionBtnText}>📲 Compartilhar com Amigos</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, styles.whatsappBtn]} 
                onPress={() => openWhatsApp(selectedBusiness?.whatsapp || selectedBusiness?.phone)}
              >
                <Text style={styles.actionBtnText}>💬 Chamar no WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, styles.instagramBtn]} 
                onPress={() => openInstagram(selectedBusiness?.instagram)}
              >
                <Text style={styles.actionBtnText}>📸 Ver Instagram</Text>
              </TouchableOpacity>

              {selectedBusiness?.address && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.mapBtn]} 
                  onPress={() => openMaps(selectedBusiness.address)}
                >
                  <Text style={styles.actionBtnText}>🗺️ Como Chegar (Mapa)</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedBusiness(null)}>
              <Text style={styles.closeBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  brandBox: {
    backgroundColor: '#0F172A',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EC4899',
    alignItems: 'center',
  },
  brandTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    color: '#EC4899',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sloganText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  favFilterBtn: { backgroundColor: '#1E293B', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  favFilterBtnActive: { backgroundColor: '#EC4899', borderColor: '#EC4899' },
  favFilterBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  searchSection: { paddingHorizontal: 20, marginBottom: 12 },
  searchInput: { backgroundColor: '#1E293B', color: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  quickFiltersScroll: { paddingLeft: 20, marginBottom: 20, flexGrow: 0 },
  quickChip: { backgroundColor: '#1E293B', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#334155', marginRight: 10 },
  quickChipActive: { backgroundColor: '#EC4899', borderColor: '#EC4899' },
  quickChipText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  quickChipTextActive: { color: '#FFF', fontWeight: 'bold' },
  categoriesScroll: { paddingLeft: 20, marginBottom: 25, flexGrow: 0 },
  categoryItem: { alignItems: 'center', marginRight: 20 },
  categoryIcon: { fontSize: 22, backgroundColor: '#1E293B', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  categoryIconActive: { backgroundColor: '#EC4899', borderColor: '#EC4899' },
  categoryLabel: { color: '#94A3B8', fontSize: 11, marginTop: 6, fontWeight: '600' },
  categoryLabelActive: { color: '#EC4899', fontWeight: 'bold' },
  section: { marginBottom: 25 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold' },
  itineraryCard: { backgroundColor: '#1E1B4B', width: 220, borderRadius: 16, padding: 14, marginLeft: 20, borderWidth: 1, borderColor: '#6366F1' },
  itineraryBadge: { color: '#818CF8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  itineraryTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  itinerarySub: { color: '#94A3B8', fontSize: 12 },
  highlightCard: { backgroundColor: '#1E293B', width: 200, borderRadius: 16, padding: 12, marginLeft: 20, borderWidth: 1, borderColor: '#334155', position: 'relative' },
  heartBtn: { position: 'absolute', top: 18, right: 18, zIndex: 10, backgroundColor: 'rgba(15, 23, 42, 0.7)', padding: 6, borderRadius: 20 },
  cardImage: { width: '100%', height: 100, borderRadius: 10, marginBottom: 10 },
  imagePlaceholder: { backgroundColor: '#0F172A', height: 100, borderRadius: 10, marginBottom: 10, justifyContent: 'center', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold', flexShrink: 1 },
  verifiedBadge: { backgroundColor: '#38BDF8', color: '#0F172A', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  cardSub: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  benefitBadge: { backgroundColor: '#059669', padding: 5, borderRadius: 6, marginTop: 6 },
  benefitText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  promoBadge: { backgroundColor: '#EC4899', padding: 6, borderRadius: 8, marginTop: 6 },
  promoBadgeModal: { backgroundColor: '#EC4899', padding: 10, borderRadius: 10, marginVertical: 8 },
  promoText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  benefitBoxModal: { backgroundColor: '#065F46', borderWidth: 1, borderColor: '#10B981', padding: 12, borderRadius: 12, marginVertical: 10 },
  benefitBoxTitle: { color: '#34D399', fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
  benefitBoxText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  tripCard: { backgroundColor: '#0284C7', width: 220, height: 100, borderRadius: 16, padding: 16, marginLeft: 20, justifyContent: 'flex-end' },
  emptyCard: { backgroundColor: '#1E293B', width: 240, height: 100, borderRadius: 16, marginLeft: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed' },
  listCard: { backgroundColor: '#1E293B', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, marginHorizontal: 20, marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  cardInfo: { flex: 1 },
  heartListBtn: { padding: 8 },
  emptyText: { color: '#64748B', paddingHorizontal: 20, fontSize: 13 },
  emptyTextHorizontal: { color: '#64748B', marginLeft: 20, fontSize: 13 },
  businessBanner: { backgroundColor: '#1E293B', marginHorizontal: 20, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#EC4899', alignItems: 'center' },
  businessBannerTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  businessBannerSub: { color: '#94A3B8', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1E293B', width: '100%', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalImage: { width: '100%', height: 140, borderRadius: 12, marginBottom: 15 },
  modalTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', marginRight: 6 },
  modalText: { color: '#CBD5E1', fontSize: 14, marginBottom: 6 },
  actionButtonsContainer: { marginTop: 10, gap: 8 },
  actionBtn: { padding: 12, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  shareBtn: { backgroundColor: '#8B5CF6' },
  whatsappBtn: { backgroundColor: '#22C55E' },
  instagramBtn: { backgroundColor: '#E1306C' },
  mapBtn: { backgroundColor: '#38BDF8' },
  closeBtn: { backgroundColor: '#334155', marginTop: 15, padding: 12, borderRadius: 10, alignItems: 'center' },
  closeBtnText: { color: '#FFF', fontWeight: 'bold' },
});

