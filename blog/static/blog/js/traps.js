// Traps

var _trap = [
    // ["", " Trap Complete","", 48, 105],
    // ["", " Trap Decline","", 48, 105],
    // ["", " Trap Mistake","", 48, 105],
    // ["", " Trap Decline","", 48, 105],

    ["", "Bishops vs knights","1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Na5 6.Bb5+ c6 7.dxc6 bxc6 8.Bd3 h6 9.Ne4 Nd5 10.O-O Be7 11.Nbc3 O-O 12.Re1 f5 13.Ng3 e4 14.Bf1 Bd6 15.d3 exd3 16.Qxd3 f4 17.Nge4 Bc7 18.Nxd5 cxd5 19.Nc3 Bb7 20.Be2 f3 21.Bxf3 Qd6 22.g3 Rxf3 23.Qxf3 d4 24.Ne4 Qg6 25.Bf4 Rf8 26.Kh1 Bxf4 27.gxf4 Nc4 28.Qg2 Qxg2+ 29.Kxg2 Rxf4 30.f3 Ne3+ 31.Kg3 g5 32.Rac1 Nf5+ 33.Kf2 Nh4 34.Nd2 Nxf3 35.Nxf3 Rxf3+ 36.Ke2 Rh3 37.Rcd1 Bf3+ 38.Kf2 Bxd1 39.Rxd1 Rxh2+ 40.Kg3 Rxc2 41.Rxd4 Rxb2 42.Ra4 Rb7 43.Kg4 Kg7 44.Ra6 Rb4+ 45.Kf5 Rf4+ 46.Ke5 Rf7 47.Ke4 h5 48.Ke3 h4 49.Ra4 Kg6 50.Ra6+ Kh5 51.Ra4 h3 52.Rc4 g4 53.Rc1 g3 54.Rh1 h2 0-1", 48, 105],

    ["C50", "Legal' Trap Complete","1.e4 e5 2.Nf3 Nc6 3.Bc4 d6 4.Nc3 Bg4 5.h3 Bh5 6.Nxe5 Bxd1 7.Bxf7+ Ke7 8.Nd5#", 48, 205],
    ["C50", "Legal' Trap Decline","1.e4 e5 2.Nf3 Nc6 3.Bc4 d6 4.Nc3 Bg4 5.h3 Bh5 6.Nxe5 Bxd1 7.Qxh5 Nxc4 8.Qb5+ c6 9.Qxc4", 48, 205],
    ["C50", "Legal' Trap Mistake","1.e4 e5 2.Nf3 Nc6 3.Bc4 d6 4.Nc3 Bg4 5.h3 Bh5", 48, 205],
    ["C50", "Legal' Trap Decline","1.e4 e5 2.Nf3 Nc6 3.Bc4 d6 4.Nc3 Bg4 5.h3 Bxf3", 48, 205],

    //Ruy Lopez
    //Spanish Berlin Defense
    ["", "Mortimer Trap Complete","1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3 Ne7 5.Nxe5 c6 6.Nc4 d6 7.Ba4 b5 8.O-O bxa4 9.Qe2 Be6 10.f4 d5", 48, 105],
    ["", "Mortimer Trap Complete Game setup","1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3 Ne7 5.Nxe5 c6 6.Nc4 d6 7.Ba4 b5 8.Bxb5 cxb5 9.Ne3 d5 10.Nd2 Nc6 11.a4 d4 12.Nef1 b4 13.Ng3 Bd6 14.O-O Bc7 15.h3 Bxg3 16.fxg3 Qe7 17.g4 Nd7 18.Nf3 O-O 19.a5 Ba6 20.Bg5 Qd6", 48, 105],
    
    ["", "Mortimer Trap Escape","1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3 Ne7 5.Nxe5 c6 6.Nxf7 Kxf7 7.e5 Ng6 8.exf6 Qxf6 9.Bc4+ d5 10.Bb3 a5 11.c3 a4 12.Bxa4 Nh4 13.O-O h5 14.Kh1 Bd6", 48, 105],
    
    ["", "Mortimer Trap Decline bad","1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3 Ne7 5.d4 exd4 6.e5 Nfd5 7.Qxd4 c6 8.Bd3 b6 9.Nbd2 Ng6 10.Ne4 Bb7 11.O-O Be7", 48, 105],
    ["", "Mortimer Trap Decline bad exchange","1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3 Ne7 5.d4 c6 6.dxe5 Nxe4 7.Bd3 Nc5 8.O-O d5 9.exd6 Qxd6", 48, 105],
    ["", "Mortimer Trap Decline bad safe","1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3 Ne7 5.d4 c6 6.Bd3 d6 7.O-O exd4 8.Nxd4 Ng6 9.c4 Be7 10.Nc3 O-O", 48, 105],
    
    
    ["", "Mortimer Trap Mistake","1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3 5.Nxe5", 48, 105],
    ["", "Mortimer Trap Decline","1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3", 48, 105],

    ["", "Lasker Trap Decline","1.d4 d5 2.c4 e5 3.dxe5 d4 4.e3 Bb4+ 5.Bd2 dxe3 6.Bxb4 exf2 7.Ke2 fxg1=N+ 8.Ke1 Qh4+", 48, 105],
    
    ["", "Budapest Trap Complete","1.d4 Nf6 2.Nd2 e5 3.dxe5 Ng4 4.h3 Ne3 5.fxe3 Qh4+ 6.g3 Qxg3#", 48, 105],
    ["", "Budapest Trap Decline","1.d4 Nf6 2.Nd2 e5 3.dxe5 Ng4 4.h3 Ne3 5.fxe3 Qh4+ 6.g3 Qxg3#", 48, 105],
    ["", "Budapest Trap Decline","1.d4 Nf6 2.Nd2 e5 3.dxe5 Ng4 4.Ndf3 Nc6 5.Bf4 d6 6.e4 Ngxe5 7.Nxe5 Nxe5 8.Qd2 g6 9.Ne2 Bg7 10.Bg5 Nc4 11.Qf4 f6 12.Bh6 O-O 13.Nc3 Bxh6 14.Bxc4+ Kg7", 48, 105],

    ["", "Blackburne-Shilling Trap Decline","1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4", 48, 105],
    ["", "Blackburne-Shilling Trap Decline","1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4", 48, 105],
    ["", "Flagship Trap Decline","1.e4 e5 2.Nf3 Nc6 3.c3 Nf6 4.d4 Nxe4 5.d5 Ne7", 48, 105],
    ["", "King’s Gambit Nordwalde Trap Decline","1.e4 e5 2.f4 Qf6 3.Nf3 Qxf4 4.Nc3 Bb4 5.Bc4 Bxc3 6.0-0", 48, 105],


]
