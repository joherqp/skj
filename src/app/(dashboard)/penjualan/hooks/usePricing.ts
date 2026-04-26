
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useMemo } from 'react';

export function usePricing() {
    const { pelanggan, barang, harga, promo, penjualan } = useDatabase();
    const { user } = useAuth();

    const getPriceDetailed = useCallback((
        productId: string,
        unitId: string | undefined,
        qty: number,
        conversion: number,
        customerId: string,
        totalMixMatchQty: number,
        productQtyBase?: number
    ): { price: number, tier?: { min: number; max: number; harga: number; isMixMatch?: boolean } } => {
        const selectedCustomer = pelanggan.find(p => p.id === customerId);
        const product = barang.find(b => b.id === productId);

        const findRule = (targetUnitId: string | undefined) => {
            if (!targetUnitId) return undefined;
            
            const customerCabangId = selectedCustomer?.cabangId;
            const userCabangId = user?.cabangId;

            const rules = harga.filter(h => {
                const isProductMatch = h.barangId === productId;
                const isUnitMatch = h.satuanId === targetUnitId;
                const isStatusMatch = h.status === 'disetujui';
                const isDateMatch = new Date(h.tanggalEfektif) <= new Date();
                
                // Customer category match
                const isCustomerGroupMatch = (!h.kategoriPelangganId && (!h.kategoriPelangganIds || h.kategoriPelangganIds.length === 0)) || 
                    (selectedCustomer && (h.kategoriPelangganId === selectedCustomer.kategoriId || h.kategoriPelangganIds?.includes(selectedCustomer.kategoriId)));

                if (!isProductMatch || !isUnitMatch || !isStatusMatch || !isDateMatch || !isCustomerGroupMatch) return false;

                // Branch filtering logic
                const isGlobal = (!h.cabangId || h.cabangId === 'all') && (!h.cabangIds || h.cabangIds.length === 0);
                const matchesUserBranch = userCabangId && userCabangId !== 'all' && (h.cabangId === userCabangId || h.cabangIds?.includes(userCabangId));
                const matchesCustomerBranch = customerCabangId && customerCabangId !== 'all' && (h.cabangId === customerCabangId || h.cabangIds?.includes(customerCabangId));

                return isGlobal || matchesUserBranch || matchesCustomerBranch;
            });

            rules.sort((a, b) => {
                const getScore = (h: any) => {
                    let score = 0;
                    const isGlobal = (!h.cabangId || h.cabangId === 'all') && (!h.cabangIds || h.cabangIds.length === 0);
                    
                    if (customerCabangId && customerCabangId !== 'all' && (h.cabangId === customerCabangId || h.cabangIds?.includes(customerCabangId))) {
                        score = 3;
                    } else if (userCabangId && userCabangId !== 'all' && (h.cabangId === userCabangId || h.cabangIds?.includes(userCabangId))) {
                        score = 2;
                    } else if (!isGlobal) {
                        score = 1;
                    }
                    return score;
                };
                return getScore(b) - getScore(a);
            });

            return rules[0];
        };

        let matchedRule = findRule(unitId);
        let usingBaseRule = false;

        if (!matchedRule && product && unitId !== product.satuanId) {
            matchedRule = findRule(product.satuanId);
            usingBaseRule = true;
        }

        if (matchedRule) {
            let price = matchedRule.harga;
            let tierVal: { min: number; max: number; harga: number; isMixMatch?: boolean } | undefined;

            if (matchedRule.grosir && matchedRule.grosir.length > 0) {
                const sortedTiers = [...matchedRule.grosir].sort((a, b) => b.min - a.min);
                // Logic: use total combined qty of this product in cart for tier calculation
                const totalQtyInBaseForTier = productQtyBase !== undefined ? productQtyBase : (qty * conversion);

                tierVal = sortedTiers.find(g => {
                    const quantityToCheck = g.isMixMatch ? totalMixMatchQty : totalQtyInBaseForTier;
                    return quantityToCheck >= g.min;
                });

                if (tierVal) price = tierVal.harga;
            }
            if (usingBaseRule) return { price: price * conversion, tier: tierVal };
            return { price, tier: tierVal };
        }
        return { price: 0 };
    }, [pelanggan, barang, harga, user]);

    const getPromo = useCallback((
        productId: string,
        price: number,
        qty: number,
        conversion: number,
        customerId: string,
        productQtyBase?: number,
        selectedPromoId?: string,
        perNotaQuantities?: Map<string, number>
    ): {
        discount: number,
        bonus?: {
            productIds: string[],
            qty: number,
            mechanism: 'random' | 'single' | 'mix',
            promoId: string
        },
        availablePromos: { id: string; nama: string; tipe: string; nilai: number; bonusProdukIds?: string[]; isBest?: boolean; metodeKelipatan?: 'per_item' | 'per_nota' | 'periode_promo'; hadiah?: string; snk?: string }[],
        appliedPromoId?: string,
        earnedReward?: {
            nama: string,
            hadiah: string,
            qty: number,
            snk?: string
        }
    } => {
        const now = new Date();
        const totalInBase = productQtyBase !== undefined ? productQtyBase : (qty * conversion);
        const currentRowInBase = qty * conversion;



        const activePromos = promo.filter(p => {
            // Check active status
            const isPromoActive = p.aktif !== undefined ? p.aktif : p.isActive;
            if (!isPromoActive) return false;

            // Check dates
            const startDateRaw = (p as any).berlakuMulai || (p as any).berlaku_mulai || p.tanggalMulai;
            const endDateRaw = (p as any).berlakuSampai || (p as any).berlaku_sampai || p.tanggalBerakhir;

            const start = startDateRaw ? new Date(startDateRaw) : new Date();
            const end = endDateRaw ? new Date(endDateRaw) : null;

            if (isNaN(start.getTime())) return false;

            if (start > now || (end && end < now)) return false;
            if (p.scope === 'selected_products' && p.targetProdukIds && !p.targetProdukIds.includes(productId)) return false;
            
            const isGlobal = (!p.cabangId || p.cabangId === 'all') && (!p.cabangIds || p.cabangIds.length === 0);
            if (!isGlobal) {
                const customerCabangId = pelanggan.find(pl => pl.id === customerId)?.cabangId;
                const matchUser = user?.cabangId && user.cabangId !== 'all' && (p.cabangId === user.cabangId || p.cabangIds?.includes(user.cabangId));
                const matchCustomer = customerCabangId && customerCabangId !== 'all' && (p.cabangId === customerCabangId || p.cabangIds?.includes(customerCabangId));
                
                if (!matchUser && !matchCustomer) return false;
            }

            const isAggregated = p.metodeKelipatan === 'per_nota' || p.metodeKelipatan === 'periode_promo';
            const basisQty = (isAggregated && perNotaQuantities) ? (perNotaQuantities.get(p.id) || 0) : totalInBase;
            if (p.minQty && basisQty < p.minQty) return false;

            return true;
        });

        // Calculate potential of EACH promo
        const candidates = activePromos.map(p => {
            let potentialDiscount = 0;
            let potentialBonus = undefined;

            const isAggregated = p.metodeKelipatan === 'per_nota' || p.metodeKelipatan === 'periode_promo';
            const calculationBasis = (isAggregated && perNotaQuantities) ? (perNotaQuantities.get(p.id) || 0) : totalInBase;
            let potentialReward = undefined;

            if (p.tipe === 'persen' || (p.tipe === 'event' && p.tipeDiskon === 'persen')) {
                const gross = price * qty;
                potentialDiscount = gross * (p.nilai / 100);
            } else if (p.tipe === 'nominal' || (p.tipe === 'event' && p.tipeDiskon === 'nominal')) {
                const maxApply = p.maxApply || p.max_apply || Infinity;
                if (p.isKelipatan) {
                    const effectiveMinQty = p.minQty && p.minQty > 0 ? p.minQty : 1;
                    let multiplier = Math.floor(calculationBasis / effectiveMinQty);

                    if (maxApply && maxApply > 0) {
                        multiplier = Math.min(multiplier, maxApply);
                    }

                    const totalDiscountGlobal = multiplier * p.nilai;

                    if (isAggregated) {
                        // Proportional share: (ItemQty / TotalQty) * GlobalDiscount
                        potentialDiscount = calculationBasis > 0 ? totalDiscountGlobal * (currentRowInBase / calculationBasis) : 0;
                    } else {
                        // Per Item: simple calculation
                        potentialDiscount = multiplier * p.nilai; // logic mismatch in original?
                        // Original logic: 
                        // const totalDiscount = multiplier * p.nilai;
                        // potentialDiscount = totalInBase > 0 ? totalDiscount * (currentRowInBase / totalInBase) : 0;
                        // If per_item, totalInBase IS the basis. so currentRowInBase/totalInBase is 1 (if no conversion mess).
                        // Let's keep specific logic:
                        potentialDiscount = totalDiscountGlobal * (currentRowInBase / calculationBasis);
                    }
                } else {
                    // Not Kelipatan
                    if (isAggregated) {
                        // Flat nominal once per transaction?
                        // "Jika pembelian mencapai jumlah ini, promo berlaku."
                        // e.g. Buy 10 get 10k off. Total 10. Discount 10k.
                        // Share proportionally.
                        potentialDiscount = calculationBasis > 0 ? p.nilai * (currentRowInBase / calculationBasis) : 0;
                    } else {
                        potentialDiscount = p.nilai; // Per item flat discount? "Potongan Harga" usually per item.
                        // But logic above used proportional? 
                        // "potentialDiscount = totalInBase > 0 ? p.nilai * (currentRowInBase / totalInBase) : 0;"
                        // If totalInBase == currentRowInBase, it's p.nilai.
                        // I'll keep p.nilai for per_item non-kelipatan.
                        // Wait, previous code: p.nilai * (currentRowInBase / totalInBase).
                        // If conversion=1, this is p.nilai.
                        potentialDiscount = p.nilai * (currentRowInBase / totalInBase);
                    }
                }
            } else if (p.tipe === 'produk') {
                const maxApply = p.maxApply || p.max_apply || Infinity;
                const effectiveMinQty = p.minQty && p.minQty > 0 ? p.minQty : 1;
                let bonusCount = 0;

                if (p.isKelipatan) {
                    let multiplier = Math.floor(calculationBasis / effectiveMinQty);
                    if (maxApply && maxApply > 0) {
                        multiplier = Math.min(multiplier, maxApply);
                    }
                    bonusCount = multiplier * (p.nilai && p.nilai > 0 ? p.nilai : 1);
                } else {
                    bonusCount = (p.nilai && p.nilai > 0 ? p.nilai : 1);
                }

                if (bonusCount > 0) {
                    const productOptions = p.bonusProdukIds && p.bonusProdukIds.length > 0 ? p.bonusProdukIds : (p.bonusProdukId ? [p.bonusProdukId] : []);
                    if (productOptions.length > 0) {
                        potentialBonus = {
                            productIds: productOptions,
                            qty: bonusCount,
                            mechanism: p.mekanismeBonus || 'random',
                            promoId: p.id
                        };
                    }
                }
            } else if (p.tipe === 'event' || p.metodeKelipatan === 'periode_promo') {
                const maxApply = p.maxApply || p.max_apply || Infinity;
                const effectiveMinQty = p.minQty && p.minQty > 0 ? p.minQty : 0;
                const bonusStep = p.syarat_jumlah || 0;

                // Cumulative Logic
                const start = new Date(p.tanggalMulai || p.berlakuMulai || 0);
                const end = (p.tanggalBerakhir || p.berlakuSampai) 
                    ? new Date(p.tanggalBerakhir || p.berlakuSampai || 0) 
                    : new Date('2099-12-31');

                // User Rule: Only paid invoices count
                const customerHistory = penjualan.filter(sj => 
                    sj.pelangganId === customerId && 
                    (sj.status === 'lunas' || sj.isLunas === true) &&
                    new Date(sj.tanggal) >= start &&
                    new Date(sj.tanggal) <= end
                );

                let historyBasis = 0;
                let historyRewards = 0; // Main prize count
                let historyBonusValue = 0; // Cashback value

                customerHistory.forEach(sj => {
                    sj.items.forEach(item => {
                        const matches = !p.targetProdukIds || p.targetProdukIds.length === 0 || p.targetProdukIds.includes(item.barangId);
                        if (matches) {
                            historyBasis += (item.jumlah * (item.konversi || 1));
                        }
                        if (item.promoId === p.id) {
                            if (item.earnedReward) historyRewards += item.earnedReward.qty;
                            if (item.diskon) historyBonusValue += item.diskon;
                        }
                    });
                });

                const totalBasis = historyBasis + calculationBasis;
                
                // 1. Calculate Main Reward (Milestone)
                let totalMainMultiplier = 0;
                if (effectiveMinQty > 0) {
                    if (p.isKelipatan) {
                        totalMainMultiplier = Math.floor(totalBasis / effectiveMinQty);
                    } else if (totalBasis >= effectiveMinQty) {
                        totalMainMultiplier = 1;
                    }
                    if (maxApply && maxApply > 0) {
                        totalMainMultiplier = Math.min(totalMainMultiplier, maxApply);
                    }
                }

                // 2. Calculate Bonus Reward (Step/Kelipatan)
                let totalBonusDiscount = 0;
                if (bonusStep > 0 && p.nilai > 0) {
                    const bonusMultiplier = Math.floor(totalBasis / bonusStep);
                    totalBonusDiscount = bonusMultiplier * p.nilai;
                }

                const earnedMainThisTime = Math.max(0, totalMainMultiplier - historyRewards);
                const earnedBonusThisTime = Math.max(0, totalBonusDiscount - historyBonusValue);

                if (earnedMainThisTime > 0) {
                    potentialReward = {
                        nama: p.nama,
                        hadiah: p.hadiah || 'Reward Event',
                        qty: earnedMainThisTime,
                        snk: p.snk
                    };
                }

                if (earnedBonusThisTime > 0) {
                    // Proportionally share the bonus discount across this row's contribution
                    // This is a bit complex for accumulated discount, but we'll apply it as potentialDiscount
                    potentialDiscount = earnedBonusThisTime;
                }
            }

            // Evaluate value for "Best" determination (approximate value of bonus?)
            // For now, we mainly compare discount. For bonus/reward, we might prioritize it if discount is 0.
            const valueScore = potentialDiscount > 0 ? potentialDiscount : (potentialBonus || potentialReward ? 999999 : 0); // Bonus/Reward is considered "high value"

            return { p, potentialDiscount, potentialBonus, potentialReward, valueScore };
        });

        // Sort by value score desc
        candidates.sort((a, b) => b.valueScore - a.valueScore);

        const availablePromos = candidates.map((c, idx) => ({
            id: c.p.id,
            nama: c.p.nama,
            tipe: c.p.tipe,
            nilai: c.p.nilai,
            bonusProdukIds: c.p.bonusProdukIds || (c.p.bonusProdukId ? [c.p.bonusProdukId] : []),
            isBest: idx === 0,
            metodeKelipatan: c.p.metodeKelipatan,
            hadiah: c.p.hadiah,
            snk: c.p.snk
        }));

        // Determine Which to Apply
        let selectedCandidate = candidates[0]; // Default to best

        if (selectedPromoId === 'NONE') {
            return { discount: 0, availablePromos };
        }

        if (selectedPromoId) {
            const found = candidates.find(c => c.p.id === selectedPromoId);
            if (found) {
                selectedCandidate = found;
            } else {
                // Selected promo no longer valid? Fallback to Best or None?
                // Let's fallback to Best for continuity, or None? Best is safer.
            }
        }

        if (!selectedCandidate) {
            return { discount: 0, availablePromos };
        }

        return {
            discount: selectedCandidate.potentialDiscount,
            bonus: selectedCandidate.potentialBonus,
            earnedReward: selectedCandidate.potentialReward,
            availablePromos,
            appliedPromoId: selectedCandidate.p.id
        };
    }, [promo, pelanggan, user, penjualan]);

    return useMemo(() => ({ getPriceDetailed, getPromo }), [getPriceDetailed, getPromo]);
}
