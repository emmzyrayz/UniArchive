// schooldata.ts

// Define the interface for a university
interface University {
    name: string;
    state: string;
    city: string;
    abbreviation: string;
    website: string;
    type?: string;
}

// Create a constant that holds the university data
const universities: University[] = [
        {
            "name": "Abia State University, Uturu",
            "state": "Abia",
            "city": "Uturu",
            "abbreviation": "ABSU",
            "website": "https://abiastateuniversity.edu.ng/"
        },
        {
            "name": "Achievers University, Owo",
            "state": "Ondo",
            "city": "Owo",
            "abbreviation": "auo",
            "website": "https://www.achievers.edu.ng/"
        },
        {
            "name": "Adamawa State University, Mubi",
            "state": "Adamawa",
            "city": "Mubi",
            "abbreviation": "ADSU",
            "website": "http://www.adsu.edu.ng"
        },
        {
            "name": "Adekunle Ajasin University, Akungba",
            "state": "Ondo",
            "city": "Akungba",
            "abbreviation": "AAUA",
            "website": "http://www.aaua.edu.ng"
        },
        {
            "name": "Adeleke University, Ede",
            "state": "Osun",
            "city": "Ede",
            "abbreviation": "aue",
            "website": "https://adelekeuniversity.edu.ng/"
        },
        {
            "name": "Admiralty University of Nigeria",
            "state": "Delta",
            "city": "",
            "abbreviation": "adun",
            "website": "https://adun.edu.ng/"
        },
        {
            "name": "Afe Babalola University",
            "state": "Ekiti",
            "city": "",
            "abbreviation": "abuad",
            "website": "https://www.abuad.edu.ng/"
        },
        {
            "name": "Ahmadu Bello University, Zaria",
            "state": "Kaduna",
            "city": "Zaria",
            "abbreviation": "ABU",
            "website": "http://www.abu.edu.ng"
        },
        {
            "name": "African Univeristy of Science and Technology",
            "state": "Federal Capital Territory",
            "city": "",
            "abbreviation": "aust",
            "website": "https://aust.edu.ng/"
        },
        {
            "name": "Ajayi Crowther University, Oyo",
            "state": "Oyo",
            "city": "Oyo",
            "abbreviation": "ACU",
            "website": "http://www.acu.edu.ng"
        },
        {
            "name": "Alex Ekwueme Federal University, Ndufu-Alike",
            "state": "Ebonyi",
            "city": "",
            "abbreviation": "funai",
            "website": "https://funai.edu.ng/"
        },
        {
            "name": "Akwa Ibom State University, Uyo",
            "state": "Akwa Ibom",
            "city": "Uyo",
            "abbreviation": "AKSU",
            "website": "http://www.aksu.edu.ng"
        },
        {
            "name": "Al-Hikmah University, Ilorin",
            "state": "Kwara",
            "city": "Ilorin",
            "abbreviation": "AHU",
            "website": "http://www.alhikmah.edu.ng"
        },
        {
            "name": "Al-Qalam University, Katsina",
            "state": "Katsina",
            "city": "",
            "abbreviation": "auk",
            "website": "https://auk.edu.ng/"
        },
        {
            "name": "Ambrose Alli University, Ekpoma",
            "state": "Edo",
            "city": "Ekpoma",
            "abbreviation": "AAU",
            "website": "http://www.aauekpoma.edu.ng"
        },
        {
            "name": "American University of Nigeria, Yola",
            "state": "Adamawa",
            "city": "Yola",
            "abbreviation": "AUN",
            "website": "http://www.aun.edu.ng"
        },
        {
            "name": "Anambra State University, Uli",
            "state": "Anambra",
            "city": "Uli",
            "abbreviation": "ANSU",
            "website": "http://www.ansu.edu.ng"
        },
        {
            "name": "Arthur Jarvis University, Calabar",
            "state": "Cross River",
            "city": "Calabar",
            "abbreviation": "AJU",
            "website": "http://www.arthurjarvisuniversity.edu.ng"
        },
        {
            "name": "Babcock University, Ilishan-Remo",
            "state": "Ogun",
            "city": "Ilishan-Remo",
            "abbreviation": "BABCOCK",
            "website": "http://www.babcock.edu.ng"
        },
        {
            "name": "Bauchi State University, Gadau",
            "state": "Bauchi",
            "city": "Gadau",
            "abbreviation": "BASUG",
            "website": "http://www.basug.edu.ng"
        },
        {
            "name": "Bayero University, Kano",
            "state": "Kano",
            "city": "Kano",
            "abbreviation": "BUK",
            "website": "http://www.buk.edu.ng"
        },
        {
            "name": "Baze University, Abuja",
            "state": "Federal Capital Territory",
            "city": "Abuja",
            "abbreviation": "BAZE",
            "website": "http://www.bazeuniversity.edu.ng"
        },
        {
            "name": "Bells University of Technology, Ota",
            "state": "Ogun",
            "city": "Ota",
            "abbreviation": "BELLS",
            "website": "http://www.bellsuniversity.edu.ng"
        },
        {
            "name": "Benson Idahosa University, Benin City",
            "state": "Edo",
            "city": "Benin City",
            "abbreviation": "BIU",
            "website": "http://www.biu.edu.ng"
        },
        {
            "name": "Benue State University, Makurdi",
            "state": "Benue",
            "city": "Makurdi",
            "abbreviation": "BSUM",
            "website": "http://www.bsum.edu.ng"
        },
        {
            "name": "Bingham University, Karu",
            "state": "Nasarawa",
            "city": "Karu",
            "abbreviation": "BINGHAM",
            "website": "http://www.binghamuni.edu.ng"
        },
        {
            "name": "Bowen University, Iwo",
            "state": "Osun",
            "city": "Iwo",
            "abbreviation": "BOWEN",
            "website": "http://www.bowenuniversity.edu.ng"
        },
        {
            "name": "Bukar Abba Ibrahim University, Damaturu",
            "state": "Yobe",
            "city": "Damaturu",
            "abbreviation": "BUKAR",
            "website": "http://www.bukarabbaibrahimuniversity.edu.ng"
        },
        {
            "name": "Caleb University, Lagos",
            "state": "Lagos",
            "city": "Lagos",
            "abbreviation": "CALEB",
            "website": "http://www.calebuniversity.edu.ng"
        },
        {
            "name": "Caritas University, Enugu",
            "state": "Enugu",
            "city": "Enugu",
            "abbreviation": "CARITAS",
            "website": "http://www.caritasuni.edu.ng"
        },
        {
            "name": "Chrisland University, Abeokuta",
            "state": "Ogun",
            "city": "Abeokuta",
            "abbreviation": "CHRISLAND",
            "website": "http://www.chrislanduniversity.edu.ng"
        },
        {
            "name": "Chukwuemeka Odumegwu Ojukwu University, Uli",
            "state": "Anambra",
            "city": "Uli",
            "abbreviation": "COOU",
            "website": "http://www.coou.edu.ng"
        },
        {
            "name": "Covenant University, Ota",
            "state": "Ogun",
            "city": "Ota",
            "abbreviation": "CU",
            "website": "http://www.covenantuniversity.edu.ng"
        },
        {
            "name": "Crawford University, Igbesa",
            "state": "Ogun",
            "city": "Igbesa",
            "abbreviation": "CRAWFORD",
            "website": "http://www.crawforduniversity.edu.ng"
        },
        {
            "name": "Cross River University of Technology, Calabar",
            "state": "Cross River",
            "city": "Calabar",
            "abbreviation": "CRUTECH",
            "website": "http://www.crutech.edu.ng"
        },
        {
            "name": "Delta State University, Abraka",
            "state": "Delta",
            "city": "Abraka",
            "abbreviation": "DELSU",
            "website": "http://www.delsu.edu.ng"
        },
        {
            "name": "Dominican University, Ibadan",
            "state": "Oyo",
            "city": "Ibadan",
            "abbreviation": "DU",
            "website": "http://www.dui.edu.ng"
        },
        {
            "name": "Dorben Polytechnic, Abuja",
            "state": "Federal Capital Territory",
            "city": "Abuja",
            "abbreviation": "DORBENPOLY",
            "website": "http://www.dorbenpoly.edu.ng"
        },
        {
            "name": "Dreamville Limited University, Abuja",
            "state": "Federal Capital Territory",
            "city": "Abuja",
            "abbreviation": "DREAMVILLE",
            "website": "http://www.dreamvilleuniversity.edu.ng"
        },
        {
            "name": "Ebonyi State University, Abakaliki",
            "state": "Ebonyi",
            "city": "Abakaliki",
            "abbreviation": "EBSU",
            "website": "http://www.ebsu.edu.ng"
        },
        {
            "name": "Edo University Iyamho, Uzaire",
            "state": "Edo",
            "city": "Uzaire",
            "abbreviation": "EDSU",
            "website": "http://www.edouniversity.edu.ng"
        },
        {
            "name": "Ekiti State University, Ado Ekiti",
            "state": "Ekiti",
            "city": "Ado Ekiti",
            "abbreviation": "EKSU",
            "website": "http://www.eksu.edu.ng"
        },
        {
            "name": "Elizade University, Ilara-Mokin",
            "state": "Ondo",
            "city": "Ilara-Mokin",
            "abbreviation": "ELIZADE",
            "website": "http://www.elizadeuniversity.edu.ng"
        },
        {
            "name": "Enugu State University of Science and Technology, Enugu",
            "state": "Enugu",
            "city": "Enugu",
            "abbreviation": "ESUT",
            "website": "http://www.esut.edu.ng"
        },
        {
            "name": "Federal University of Agriculture, Abeokuta",
            "state": "Ogun",
            "city": "Abeokuta",
            "abbreviation": "FUNAAB",
            "website": "http://www.unaab.edu.ng"
        },
        {
            "name": "Federal University of Petroleum Resources, Effurun",
            "state": "Delta",
            "city": "Effurun",
            "abbreviation": "FUPRE",
            "website": "http://www.fupre.edu.ng"
        },
        {
            "name": "Federal University of Technology, Akure",
            "state": "Ondo",
            "city": "Akure",
            "abbreviation": "FUTA",
            "website": "http://www.futa.edu.ng"
        },
        {
            "name": "Federal University of Technology, Minna",
            "state": "Niger",
            "city": "Minna",
            "abbreviation": "FUTMINNA",
            "website": "http://www.futminna.edu.ng"
        },
        {
            "name": "Federal University of Technology, Owerri",
            "state": "Imo",
            "city": "Owerri",
            "abbreviation": "FUTO",
            "website": "http://www.futo.edu.ng"
        },
        {
            "name": "Federal University, Birnin Kebbi",
            "state": "Kebbi",
            "city": "Birnin Kebbi",
            "abbreviation": "FUBK",
            "website": "http://www.fubk.edu.ng"
        },
        {
            "name": "Federal University, Dutse",
            "state": "Jigawa",
            "city": "Dutse",
            "abbreviation": "FUD",
            "website": "http://www.fud.edu.ng"
        },
        {
            "name": "Federal University, Dutsin-Ma",
            "state": "Katsina",
            "city": "Dutsin-Ma",
            "abbreviation": "FUDMA",
            "website": "http://www.fudutsinma.edu.ng"
        },
        {
            "name": "Federal University, Gashua",
            "state": "Yobe",
            "city": "Gashua",
            "abbreviation": "FUGASHUA",
            "website": "http://www.fugashua.edu.ng"
        },
        {
            "name": "Federal University, Gusau",
            "state": "Zamfara",
            "city": "Gusau",
            "abbreviation": "FUGUS",
            "website": "http://www.fugus.edu.ng"
        },
        {
            "name": "Federal University, Kashere",
            "state": "Gombe",
            "city": "Kashere",
            "abbreviation": "FUKASHERE",
            "website": "http://www.fukashere.edu.ng"
        },
        {
            "name": "Federal University, Lafia",
            "state": "Nasarawa",
            "city": "Lafia",
            "abbreviation": "FULAFIA",
            "website": "http://www.fulafia.edu.ng"
        },
        {
            "name": "Federal University, Lokoja",
            "state": "Kogi",
            "city": "Lokoja",
            "abbreviation": "FULOKOJA",
            "website": "http://www.fulokoja.edu.ng"
        },
        {
            "name": "Federal University, Ndufu-Alike",
            "state": "Ebonyi",
            "city": "Ndufu-Alike",
            "abbreviation": "FUNAI",
            "website": "http://www.funai.edu.ng"
        },
        {
            "name": "Federal University, Otuoke",
            "state": "Bayelsa",
            "city": "Otuoke",
            "abbreviation": "FUOTUOKE",
            "website": "http://www.fuotuoke.edu.ng"
        },
        {
            "name": "Federal University, Oye-Ekiti",
            "state": "Ekiti",
            "city": "Oye-Ekiti",
            "abbreviation": "FUOYE",
            "website": "http://www.fuoye.edu.ng"
        },
        {
            "name": "Federal University, Wukari",
            "state": "Taraba",
            "city": "Wukari",
            "abbreviation": "FUWUKARI",
            "website": "http://www.fuwukari.edu.ng"
        },
        {
            "name": "Federal University, Yobe",
            "state": "Yobe",
            "city": "Yobe",
            "abbreviation": "FUYO",
            "website": "http://www.fuyobe.edu.ng"
        },
        {
            "name": "Federal University, Zaria",
            "state": "Kaduna",
            "city": "Zaria",
            "abbreviation": "FUZ",
            "website": "http://www.fuz.edu.ng"
        },
        {
            "name": "Gombe State University, Gombe",
            "state": "Gombe",
            "city": "Gombe",
            "abbreviation": "GSU",
            "website": "http://www.gsu.edu.ng"
        },
        {
            "name": "Gregory University, Uturu",
            "state": "Abia",
            "city": "Uturu",
            "abbreviation": "GREGORY",
            "website": "http://www.gregoryuniversity.edu.ng"
        },
        {
            "name": "Hallmark University, Ijebu-Itele",
            "state": "Ogun",
            "city": "Ijebu-Itele",
            "abbreviation": "HALLMARK",
            "website": "http://www.hallmark.edu.ng"
        },
        {
            "name": "Hezekiah University, Umudi",
            "state": "Imo",
            "city": "Umudi",
            "abbreviation": "HEZEKIAH",
            "website": "http://www.hezekiah.edu.ng"
        },
        {
            "name": "Ibrahim Badamasi Babangida University, Lapai",
            "state": "Niger",
            "city": "Lapai",
            "abbreviation": "IBBU",
            "website": "http://www.ibbu.edu.ng"
        },
        {
            "name": "Igbinedion University, Okada",
            "state": "Edo",
            "city": "Okada",
            "abbreviation": "IUO",
            "website": "http://www.iuokada.edu.ng"
        },
        {
            "name": "Ignatius Ajuru University of Education, Rumuolumeni",
            "state": "Rivers",
            "city": "Rumuolumeni",
            "abbreviation": "IAUE",
            "website": "http://www.iaue.edu.ng"
        },
        {
            "name": "Imo State University, Owerri",
            "state": "Imo",
            "city": "Owerri",
            "abbreviation": "IMSU",
            "website": "http://www.imsu.edu.ng"
        },
        {
            "name": "Imperial College, Kaduna",
            "state": "Kaduna",
            "city": "Kaduna",
            "abbreviation": "IMPERIAL",
            "website": "http://www.imperial.edu.ng"
        },
        {
            "name": "Joseph Ayo Babalola University, Ikeji-Arakeji",
            "state": "Osun",
            "city": "Ikeji-Arakeji",
            "abbreviation": "JABU",
            "website": "http://www.jabu.edu.ng"
        },
        {
            "name": "Kaduna State University, Kaduna",
            "state": "Kaduna",
            "city": "Kaduna",
            "abbreviation": "KASU",
            "website": "http://www.kasu.edu.ng"
        },
        {
            "name": "Kano University of Science and Technology, Wudil",
            "state": "Kano",
            "city": "Wudil",
            "abbreviation": "KUST",
            "website": "http://www.kust.edu.ng"
        },
        {
            "name": "Kebbi State University of Science and Technology, Aliero",
            "state": "Kebbi",
            "city": "Aliero",
            "abbreviation": "KSUSTA",
            "website": "http://www.ksusta.edu.ng"
        },
        {
            "name": "Kings University, Ode Omu",
            "state": "Osun",
            "city": "Ode Omu",
            "abbreviation": "KINGSUNI",
            "website": "http://www.kingsuniversity.edu.ng"
        },
        {
            "name": "Kogi State University, Anyigba",
            "state": "Kogi",
            "city": "Anyigba",
            "abbreviation": "KSU",
            "website": "http://www.ksu.edu.ng"
        },
        {
            "name": "Kwara State University, Ilorin",
            "state": "Kwara",
            "city": "Ilorin",
            "abbreviation": "KWASU",
            "website": "http://www.kwasu.edu.ng"
        },
        {
            "name": "Kwararafa University, Wukari",
            "state": "Taraba",
            "city": "Wukari",
            "abbreviation": "KWARARAFA",
            "website": "http://www.kwararafauniversity.edu.ng"
        },
        {
            "name": "Lagos State University, Ojo",
            "state": "Lagos",
            "city": "Ojo",
            "abbreviation": "LASU",
            "website": "http://www.lasu.edu.ng"
        },
        {
            "name": "Landmark University, Omu-Aran",
            "state": "Kwara",
            "city": "Omu-Aran",
            "abbreviation": "LANDMARK",
            "website": "http://www.landmarkuniversity.edu.ng"
        },
        {
            "name": "Lead City University, Ibadan",
            "state": "Oyo",
            "city": "Ibadan",
            "abbreviation": "LCU",
            "website": "http://www.lcu.edu.ng"
        },
        {
            "name": "Legacy University, Okija",
            "state": "Anambra",
            "city": "Okija",
            "abbreviation": "LEGACY",
            "website": "http://www.legacyuniversity.edu.ng"
        },
        {
            "name": "Madonna University, Okija",
            "state": "Anambra",
            "city": "Okija",
            "abbreviation": "MADONNA",
            "website": "http://www.madonnauniversity.edu.ng"
        },
        {
            "name": "Mcpherson University, Seriki Sotayo",
            "state": "Ogun",
            "city": "Seriki Sotayo",
            "abbreviation": "MCU",
            "website": "http://www.mcphersonuniversity.edu.ng"
        },
        {
            "name": "Micheal and Cecilia Ibru University, Agbarha-Otor",
            "state": "Delta",
            "city": "Agbarha-Otor",
            "abbreviation": "MICHAEL",
            "website": "http://www.mciu.edu.ng"
        },
        {
            "name": "Modibbo Adama University of Technology, Yola",
            "state": "Adamawa",
            "city": "Yola",
            "abbreviation": "MAUTECH",
            "website": "http://www.mautech.edu.ng"
        },
        {
            "name": "Mountain Top University, Makogi Oba",
            "state": "Ogun",
            "city": "Makogi Oba",
            "abbreviation": "MTU",
            "website": "http://www.mtu.edu.ng"
        },
        {
            "name": "Nasarawa State University, Keffi",
            "state": "Nasarawa",
            "city": "Keffi",
            "abbreviation": "NSUK",
            "website": "http://www.nsuk.edu.ng"
        },
        {
            "name": "National Open University of Nigeria, Lagos",
            "state": "Lagos",
            "city": "Lagos",
            "abbreviation": "NOUN",
            "website": "http://www.nou.edu.ng"
        },
        {
            "name": "Niger Delta University, Wilberforce Island",
            "state": "Bayelsa",
            "city": "Wilberforce Island",
            "abbreviation": "NDU",
            "website": "http://www.ndu.edu.ng"
        },
        {
            "name": "Nigerian Defence Academy, Kaduna",
            "state": "Kaduna",
            "city": "Kaduna",
            "abbreviation": "NDA",
            "website": "http://www.nda.edu.ng"
        },
        {
            "name": "Nnamdi Azikiwe University, Awka",
            "state": "Anambra",
            "city": "Awka",
            "abbreviation": "UNIZIK",
            "website": "http://www.unizik.edu.ng"
        },
        {
            "name": "Northwest University, Kano",
            "state": "Kano",
            "city": "Kano",
            "abbreviation": "NWU",
            "website": "http://www.nwu.edu.ng"
        },
        {
            "name": "Novena University, Ogume",
            "state": "Delta",
            "city": "Ogume",
            "abbreviation": "NOVENA",
            "website": "http://www.novenauniversity.edu.ng"
        },
        {
            "name": "Nuhu Bamalli Polytechnic, Zaria",
            "state": "Kaduna",
            "city": "Zaria",
            "abbreviation": "NUBAPOLY",
            "website": "http://www.nubapoly.net"
        },
        {
            "name": "Obafemi Awolowo University, Ile-Ife",
            "state": "Osun",
            "city": "Ile-Ife",
            "abbreviation": "OAU",
            "website": "http://www.oauife.edu.ng"
        },
        {
            "name": "Obong University, Obong Ntak",
            "state": "Akwa Ibom",
            "city": "Obong Ntak",
            "abbreviation": "OBONG",
            "website": "http://www.obonguniversity.edu.ng"
        },
        {
            "name": "Oduduwa University, Ile-Ife",
            "state": "Osun",
            "city": "Ile-Ife",
            "abbreviation": "ODUDUWA",
            "website": "http://www.oduduwauniversity.edu.ng"
        },
        {
            "name": "Ogun State Institute of Technology, Igbesa",
            "state": "Ogun",
            "city": "Igbesa",
            "abbreviation": "OGITECH",
            "website": "http://www.ogitech.edu.ng"
        },
        {
            "name": "Ogun State University, Ago Iwoye",
            "state": "Ogun",
            "city": "Ago Iwoye",
            "abbreviation": "OSUSTECH",
            "website": "http://www.osustech.edu.ng"
        },
        {
            "name": "Ondo State University of Science and Technology, Okitipupa",
            "state": "Ondo",
            "city": "Okitipupa",
            "abbreviation": "OSUSTECH",
            "website": "http://www.osustech.edu.ng"
        },
        {
            "name": "Onabisi Onabanjo University, Ago Iwoye",
            "state": "Ogun",
            "city": "Ago Iwoye",
            "abbreviation": "OOU",
            "website": "http://www.oou.edu.ng"
        },
        {
            "name": "Osun State University, Osogbo",
            "state": "Osun",
            "city": "Osogbo",
            "abbreviation": "UNIOSUN",
            "website": "http://www.uniosun.edu.ng"
        },
        {
            "name": "Oyo State Technical University, Ibadan",
            "state": "Oyo",
            "city": "Ibadan",
            "abbreviation": "OYOTECH",
            "website": "http://www.oyotech.edu.ng"
        },
        {
            "name": "Pan-Atlantic University, Lagos",
            "state": "Lagos",
            "city": "Lagos",
            "abbreviation": "PAU",
            "website": "http://www.pau.edu.ng"
        },
        {
            "name": "Paul University, Awka",
            "state": "Anambra",
            "city": "Awka",
            "abbreviation": "PAUL",
            "website": "http://www.pauluniversity.edu.ng"
        },
        {
            "name": "Plateau State University, Bokkos",
            "state": "Plateau",
            "city": "Bokkos",
            "abbreviation": "PLASU",
            "website": "http://www.plasu.edu.ng"
        },
        {
            "name": "Redeemer's University, Ede",
            "state": "Osun",
            "city": "Ede",
            "abbreviation": "RUN",
            "website": "http://www.run.edu.ng"
        },
        {
            "name": "Renaissance University, Enugu",
            "state": "Enugu",
            "city": "Enugu",
            "abbreviation": "RENAISSANCE",
            "website": "http://www.rnu.edu.ng"
        },
        {
            "name": "Rhema University, Aba",
            "state": "Abia",
            "city": "Aba",
            "abbreviation": "RHEMA",
            "website": "http://www.rhemauniversity.edu.ng"
        },
        {
            "name": "Ritman University, Ikot Ekpene",
            "state": "Akwa Ibom",
            "city": "Ikot Ekpene",
            "abbreviation": "RITMAN",
            "website": "http://www.ritmanuniversity.edu.ng"
        },
        {
            "name": "Rivers State University of Science and Technology, Port Harcourt",
            "state": "Rivers",
            "city": "Port Harcourt",
            "abbreviation": "RSUST",
            "website": "http://www.rsu.edu.ng"
        },
        {
            "name": "Salem University, Lokoja",
            "state": "Kogi",
            "city": "Lokoja",
            "abbreviation": "SALEM",
            "website": "http://www.salemuniversity.edu.ng"
        },
        {
            "name": "Samuel Adegboyega University, Ogwa",
            "state": "Edo",
            "city": "Ogwa",
            "abbreviation": "SAU",
            "website": "http://www.sau.edu.ng"
        },
        {
            "name": "Sokoto State University, Sokoto",
            "state": "Sokoto",
            "city": "Sokoto",
            "abbreviation": "SSU",
            "website": "http://www.ssu.edu.ng"
        },
        {
            "name": "Southwestern University, Okun Owa",
            "state": "Ogun",
            "city": "Okun Owa",
            "abbreviation": "SWU",
            "website": "http://www.swu.edu.ng"
        },
        {
            "name": "Sule Lamido University, Kafin Hausa",
            "state": "Jigawa",
            "city": "Kafin Hausa",
            "abbreviation": "SLU",
            "website": "http://www.slu.edu.ng"
        },
        {
            "name": "Summit University, Offa",
            "state": "Kwara",
            "city": "Offa",
            "abbreviation": "SUMMITUNI",
            "website": "http://www.summituniversity.edu.ng"
        },
        {
            "name": "Tai Solarin University of Education, Ijebu-Ode",
            "state": "Ogun",
            "city": "Ijebu-Ode",
            "abbreviation": "TASUED",
            "website": "http://www.tasued.edu.ng"
        },
        {
            "name": "Taraba State University, Jalingo",
            "state": "Taraba",
            "city": "Jalingo",
            "abbreviation": "TSUJ",
            "website": "http://www.tsuniversity.edu.ng"
        },
        {
            "name": "The Technical University, Ibadan",
            "state": "Oyo",
            "city": "Ibadan",
            "abbreviation": "TECH-U",
            "website": "http://www.tech-u.edu.ng"
        },
        {
            "name": "Umaru Musa Yar'adua University, Katsina",
            "state": "Katsina",
            "city": "Katsina",
            "abbreviation": "UMYU",
            "website": "http://www.umyu.edu.ng"
        },
        {
            "name": "University of Abuja, Abuja",
            "state": "Federal Capital Territory",
            "city": "Abuja",
            "abbreviation": "UNIABUJA",
            "website": "http://www.uniabuja.edu.ng"
        },
        {
            "name": "University of Agriculture, Makurdi",
            "state": "Benue",
            "city": "Makurdi",
            "abbreviation": "UAM",
            "website": "http://www.uam.edu.ng"
        },
        {
            "name": "University of Benin, Benin City",
            "state": "Edo",
            "city": "Benin City",
            "abbreviation": "UNIBEN",
            "website": "http://www.uniben.edu.ng"
        },
        {
            "name": "University of Calabar, Calabar",
            "state": "Cross River",
            "city": "Calabar",
            "abbreviation": "UNICAL",
            "website": "http://www.unical.edu.ng"
        },
        {
            "name": "University of Ibadan, Ibadan",
            "state": "Oyo",
            "city": "Ibadan",
            "abbreviation": "UI",
            "website": "http://www.ui.edu.ng"
        },
        {
            "name": "University of Ilorin, Ilorin",
            "state": "Kwara",
            "city": "Ilorin",
            "abbreviation": "UNILORIN",
            "website": "http://www.unilorin.edu.ng"
        },
        {
            "name": "University of Jos, Jos",
            "state": "Plateau",
            "city": "Jos",
            "abbreviation": "UNIJOS",
            "website": "http://www.unijos.edu.ng"
        },
        {
            "name": "University of Lagos, Lagos",
            "state": "Lagos",
            "city": "Lagos",
            "abbreviation": "UNILAG",
            "website": "http://www.unilag.edu.ng"
        },
        {
            "name": "University of Maiduguri, Maiduguri",
            "state": "Borno",
            "city": "Maiduguri",
            "abbreviation": "UNIMAID",
            "website": "http://www.unimaid.edu.ng"
        },
        {
            "name": "University of Medical Sciences, Ondo",
            "state": "Ondo",
            "city": "Ondo",
            "abbreviation": "UNIMED",
            "website": "http://www.unimed.edu.ng"
        },
        {
            "name": "University of Mkar, Gboko",
            "state": "Benue",
            "city": "Gboko",
            "abbreviation": "UNIMKAR",
            "website": "http://www.unimkar.edu.ng"
        },
        {
            "name": "University of Nigeria, Nsukka",
            "state": "Enugu",
            "city": "Nsukka",
            "abbreviation": "UNN",
            "website": "http://www.unn.edu.ng"
        },
        {
            "name": "University of Port Harcourt, Port Harcourt",
            "state": "Rivers",
            "city": "Port Harcourt",
            "abbreviation": "UNIPORT",
            "website": "http://www.uniport.edu.ng"
        },
        {
            "name": "University of Uyo, Uyo",
            "state": "Akwa Ibom",
            "city": "Uyo",
            "abbreviation": "UNIUYO",
            "website": "http://www.uniuyo.edu.ng"
        },
        {
            "name": "University of Nigeria, Nsukka",
            "state": "Enugu",
            "city": "Nsukka",
            "abbreviation": "UNN",
            "website": "http://www.unn.edu.ng"
        },
        {
            "name": "University of Port Harcourt, Port Harcourt",
            "state": "Rivers",
            "city": "Port Harcourt",
            "abbreviation": "UNIPORT",
            "website": "http://www.uniport.edu.ng"
        },
        {
            "name": "University of Uyo, Uyo",
            "state": "Akwa Ibom",
            "city": "Uyo",
            "abbreviation": "UNIUYO",
            "website": "http://www.uniuyo.edu.ng"
        },
        {
            "name": "Usmanu Danfodiyo University, Sokoto",
            "state": "Sokoto",
            "city": "Sokoto",
            "abbreviation": "UDUSOK",
            "website": "http://www.udusok.edu.ng"
        },
        {
            "name": "Veritas University, Abuja",
            "state": "Federal Capital Territory",
            "city": "Abuja",
            "abbreviation": "VERITAS",
            "website": "http://www.veritas.edu.ng"
        },
        {
            "name": "Wellspring University, Benin City",
            "state": "Edo",
            "city": "Benin City",
            "abbreviation": "WELLSPRING",
            "website": "http://www.wellspringuniversity.edu.ng"
        },
        {
            "name": "Wesley University of Science and Technology, Ondo",
            "state": "Ondo",
            "city": "Ondo",
            "abbreviation": "WUSTO",
            "website": "http://www.wusto.edu.ng"
        },
        {
            "name": "Western Delta University, Oghara",
            "state": "Delta",
            "city": "Oghara",
            "abbreviation": "WDU",
            "website": "http://www.wduniversity.edu.ng"
        },
        {
            "name": "Yobe State University, Damaturu",
            "state": "Yobe",
            "city": "Damaturu",
            "abbreviation": "YSU",
            "website": "http://www.ysu.edu.ng"
        },
        {
            "name": "Yusuf Maitama Sule University, Kano",
            "state": "Kano",
            "city": "Kano",
            "abbreviation": "YUMSUK",
            "website": "http://www.yusufmsuk.edu.ng"
        },
            {
        "name": "Abia State University, Uturu",
        "state": "Abia",
        "city": "Uturu",
        "abbreviation": "ABSU",
        "website": "https://abiastateuniversity.edu.ng/",
        "type": "State"
      },
      { "name": "Michael Okpara University of Agriculture, Umudike",
         "state": "Abia", 
         "city": "Umudike",
        "abbreviation": "MOUAU", 
        "website": "https://mouau.edu.ng/", 
        "type": "Federal" 
      },
          {
            "name": "Achievers University, Owo",
            "state": "Ondo",
            "city": "Owo",
            "abbreviation": "auo",
            "website": "https://www.achievers.edu.ng/",
            "type": "Private"
          },
          {
            "name": "Adamawa State University, Mubi",
            "state": "Adamawa",
            "city": "Mubi",
            "abbreviation": "ADSU",
            "website": "http://www.adsu.edu.ng",
            "type": "State"
          },
          {
            "name": "Adekunle Ajasin University, Akungba",
            "state": "Ondo",
            "city": "Akungba",
            "abbreviation": "AAUA",
            "website": "http://www.aaua.edu.ng",
            "type": "State"
          },
          {
            "name": "Adeleke University, Ede",
            "state": "Osun",
            "city": "Ede",
            "abbreviation": "aue",
            "website": "https://adelekeuniversity.edu.ng/",
            "type": "Private"
          },
          {
            "name": "Admiralty University of Nigeria",
            "state": "Delta",
            "city": "Ibusa",
            "abbreviation": "adun",
            "website": "https://adun.edu.ng/",
            "type": "Private"
          },
          {
            "name": "Afe Babalola University",
            "state": "Ekiti",
            "city": "Afe Babalola University",
            "abbreviation": "abuad",
            "website": "https://www.abuad.edu.ng/",
            "type": "Private"
          },
          {
            "name": "Ahmadu Bello University, Zaria",
            "state": "Kaduna",
            "city": "Zaria",
            "abbreviation": "ABU",
            "website": "http://www.abu.edu.ng",
            "type": "Federal"
          },
          {
            "name": "African Univeristy of Science and Technology",
            "state": "Federal Capital Territory",
            "city": "Abuja",
            "abbreviation": "aust",
            "website": "https://aust.edu.ng/",
            "type": "Federal"
          },
          {
            "name": "Ajayi Crowther University, Oyo",
            "state": "Oyo",
            "city": "Oyo",
            "abbreviation": "ACU",
            "website": "http://www.acu.edu.ng",
            "type": "Private"
          },
          {
            "name": "Alex Ekwueme Federal University, Ndufu-Alike",
            "state": "Ebonyi",
            "city": "Ndufu-Alike Ikwo",
            "abbreviation": "funai",
            "website": "https://funai.edu.ng/",
            "type": "Federal"
          },
          {
            "name": "Akwa Ibom State University, Uyo",
            "state": "Akwa Ibom",
            "city": "Uyo",
            "abbreviation": "AKSU",
            "website": "http://www.aksu.edu.ng",
            "type": "State"
          },
        {
            "name": "Al-Hikmah University, Ilorin",
            "state": "Kwara",
            "city": "Ilorin",
            "abbreviation": "AHU",
            "website": "http://www.alhikmah.edu.ng"
        },
        {
            "name": "Al-Qalam University, Katsina",
            "state": "Katsina",
            "city": "Katsina",
            "abbreviation": "auk",
            "website": "https://auk.edu.ng/"
        },
        {
            "name": "Ambrose Alli University, Ekpoma",
            "state": "Edo",
            "city": "Ekpoma",
            "abbreviation": "AAU",
            "website": "http://www.aauekpoma.edu.ng"
        },
        {
            "name": "American University of Nigeria, Yola",
            "state": "Adamawa",
            "city": "Yola",
            "abbreviation": "AUN",
            "website": "http://www.aun.edu.ng"
        },
        {
            "name": "Anambra State University, Uli",
            "state": "Anambra",
            "city": "Uli",
            "abbreviation": "ANSU",
            "website": "http://www.ansu.edu.ng"
        },
        {
            "name": "Arthur Jarvis University, Calabar",
            "state": "Cross River",
            "city": "Calabar",
            "abbreviation": "AJU",
            "website": "http://www.arthurjarvisuniversity.edu.ng"
        },
        {
            "name": "Babcock University, Ilishan-Remo",
            "state": "Ogun",
            "city": "Ilishan-Remo",
            "abbreviation": "BABCOCK",
            "website": "http://www.babcock.edu.ng"
        },
        {
            "name": "Bauchi State University, Gadau",
            "state": "Bauchi",
            "city": "Gadau",
            "abbreviation": "BASUG",
            "website": "http://www.basug.edu.ng"
        },
        {
            "name": "Bayero University, Kano",
            "state": "Kano",
            "city": "Kano",
            "abbreviation": "BUK",
            "website": "http://www.buk.edu.ng"
        },
        {
            "name": "Baze University, Abuja",
            "state": "Federal Capital Territory",
            "city": "Abuja",
            "abbreviation": "BAZE",
            "website": "http://www.bazeuniversity.edu.ng"
        },
        {
            "name": "Bells University of Technology, Ota",
            "state": "Ogun",
            "city": "Ota",
            "abbreviation": "BELLS",
            "website": "http://www.bellsuniversity.edu.ng"
        },
        {
            "name": "Benson Idahosa University, Benin City",
            "state": "Edo",
            "city": "Benin City",
            "abbreviation": "BIU",
            "website": "http://www.biu.edu.ng"
        },
        {
            "name": "Benue State University, Makurdi",
            "state": "Benue",
            "city": "Makurdi",
            "abbreviation": "BSUM",
            "website": "http://www.bsum.edu.ng"
        },
        {
            "name": "Bingham University, Karu",
            "state": "Nasarawa",
            "city": "Karu",
            "abbreviation": "BINGHAM",
            "website": "http://www.binghamuni.edu.ng"
        },
        {
            "name": "Bowen University, Iwo",
            "state": "Osun",
            "city": "Iwo",
            "abbreviation": "BOWEN",
            "website": "http://www.bowenuniversity.edu.ng"
        },
        {
            "name": "Bukar Abba Ibrahim University, Damaturu",
            "state": "Yobe",
            "city": "Damaturu",
            "abbreviation": "BUKAR",
            "website": "http://www.bukarabbaibrahimuniversity.edu.ng"
        },
        {
            "name": "Caleb University, Lagos",
            "state": "Lagos",
            "city": "Lagos",
            "abbreviation": "CALEB",
            "website": "http://www.calebuniversity.edu.ng"
        },
        {
            "name": "Caritas University, Enugu",
            "state": "Enugu",
            "city": "Enugu",
            "abbreviation": "CARITAS",
            "website": "http://www.caritasuni.edu.ng"
        },
        {
            "name": "Chrisland University, Abeokuta",
            "state": "Ogun",
            "city": "Abeokuta",
            "abbreviation": "CHRISLAND",
            "website": "http://www.chrislanduniversity.edu.ng"
        },
        {
            "name": "Chukwuemeka Odumegwu Ojukwu University, Uli",
            "state": "Anambra",
            "city": "Uli",
            "abbreviation": "COOU",
            "website": "http://www.coou.edu.ng"
        },
        {
            "name": "Covenant University, Ota",
            "state": "Ogun",
            "city": "Ota",
            "abbreviation": "CU",
            "website": "http://www.covenantuniversity.edu.ng"
        },
        {
            "name": "Crawford University, Igbesa",
            "state": "Ogun",
            "city": "Igbesa",
            "abbreviation": "CRAWFORD",
            "website": "http://www.crawforduniversity.edu.ng"
        },
        {
            "name": "Cross River University of Technology, Calabar",
            "state": "Cross River",
            "city": "Calabar",
            "abbreviation": "CRUTECH",
            "website": "http://www.crutech.edu.ng"
        },
        {
            "name": "Delta State University, Abraka",
            "state": "Delta",
            "city": "Abraka",
            "abbreviation": "DELSU",
            "website": "http://www.delsu.edu.ng"
        },
        {
            "name": "Dominican University, Ibadan",
            "state": "Oyo",
            "city": "Ibadan",
            "abbreviation": "DU",
            "website": "http://www.dui.edu.ng"
        },
        {
            "name": "Dorben Polytechnic, Abuja",
            "state": "Federal Capital Territory",
            "city": "Abuja",
            "abbreviation": "DORBENPOLY",
            "website": "http://www.dorbenpoly.edu.ng"
        },
        {
            "name": "Dreamville Limited University, Abuja",
            "state": "Federal Capital Territory",
            "city": "Abuja",
            "abbreviation": "DREAMVILLE",
            "website": "http://www.dreamvilleuniversity.edu.ng"
        },
        {
            "name": "Ebonyi State University, Abakaliki",
            "state": "Ebonyi",
            "city": "Abakaliki",
            "abbreviation": "EBSU",
            "website": "http://www.ebsu.edu.ng"
        },
        {
            "name": "Edo University Iyamho, Uzaire",
            "state": "Edo",
            "city": "Uzaire",
            "abbreviation": "EDSU",
            "website": "http://www.edouniversity.edu.ng"
        },
        {
            "name": "Ekiti State University, Ado Ekiti",
            "state": "Ekiti",
            "city": "Ado Ekiti",
            "abbreviation": "EKSU",
            "website": "http://www.eksu.edu.ng"
        },
        {
            "name": "Elizade University, Ilara-Mokin",
            "state": "Ondo",
            "city": "Ilara-Mokin",
            "abbreviation": "ELIZADE",
            "website": "http://www.elizadeuniversity.edu.ng"
        },
        {
            "name": "Enugu State University of Science and Technology, Enugu",
            "state": "Enugu",
            "city": "Enugu",
            "abbreviation": "ESUT",
            "website": "http://www.esut.edu.ng"
        },
        {
            "name": "Federal University of Agriculture, Abeokuta",
            "state": "Ogun",
            "city": "Abeokuta",
            "abbreviation": "FUNAAB",
            "website": "http://www.unaab.edu.ng"
        },
        {
            "name": "Federal University of Petroleum Resources, Effurun",
            "state": "Delta",
            "city": "Effurun",
            "abbreviation": "FUPRE",
            "website": "http://www.fupre.edu.ng"
        },
        {
            "name": "Federal University of Technology, Akure",
            "state": "Ondo",
            "city": "Akure",
            "abbreviation": "FUTA",
            "website": "http://www.futa.edu.ng"
        },
        {
            "name": "Federal University of Technology, Minna",
            "state": "Niger",
            "city": "Minna",
            "abbreviation": "FUTMINNA",
            "website": "http://www.futminna.edu.ng"
        },
        {
            "name": "Federal University of Technology, Owerri",
            "state": "Imo",
            "city": "Owerri",
            "abbreviation": "FUTO",
            "website": "http://www.futo.edu.ng"
        },
        {
            "name": "Federal University, Birnin Kebbi",
            "state": "Kebbi",
            "city": "Birnin Kebbi",
            "abbreviation": "FUBK",
            "website": "http://www.fubk.edu.ng"
        },
        {
            "name": "Federal University, Dutse",
            "state": "Jigawa",
            "city": "Dutse",
            "abbreviation": "FUD",
            "website": "http://www.fud.edu.ng"
        },
        {
            "name": "Federal University, Dutsin-Ma",
            "state": "Katsina",
            "city": "Dutsin-Ma",
            "abbreviation": "FUDMA",
            "website": "http://www.fudutsinma.edu.ng"
        },
        {
            "name": "Federal University, Gashua",
            "state": "Yobe",
            "city": "Gashua",
            "abbreviation": "FUGASHUA",
            "website": "http://www.fugashua.edu.ng"
        },
        {
            "name": "Federal University, Gusau",
            "state": "Zamfara",
            "city": "Gusau",
            "abbreviation": "FUGUS",
            "website": "http://www.fugus.edu.ng"
        },
        {
            "name": "Federal University, Kashere",
            "state": "Gombe",
            "city": "Kashere",
            "abbreviation": "FUKASHERE",
            "website": "http://www.fukashere.edu.ng"
        },
        {
            "name": "Federal University, Lafia",
            "state": "Nasarawa",
            "city": "Lafia",
            "abbreviation": "FULAFIA",
            "website": "http://www.fulafia.edu.ng"
        },
        {
            "name": "Federal University, Lokoja",
            "state": "Kogi",
            "city": "Lokoja",
            "abbreviation": "FULOKOJA",
            "website": "http://www.fulokoja.edu.ng"
        },
        {
            "name": "Federal University, Otuoke",
            "state": "Bayelsa",
            "city": "Otuoke",
            "abbreviation": "FUOTUOKE",
            "website": "http://www.fuotuoke.edu.ng"
        },
        {
            "name": "Federal University, Oye-Ekiti",
            "state": "Ekiti",
            "city": "Oye-Ekiti",
            "abbreviation": "FUOYE",
            "website": "http://www.fuoye.edu.ng"
        },
        {
            "name": "Federal University, Wukari",
            "state": "Taraba",
            "city": "Wukari",
            "abbreviation": "FUWUKARI",
            "website": "http://www.fuwukari.edu.ng"
        },
        {
            "name": "Federal University, Yobe",
            "state": "Yobe",
            "city": "Yobe",
            "abbreviation": "FUYO",
            "website": "http://www.fuyobe.edu.ng"
        },
        {
            "name": "Federal University, Zaria",
            "state": "Kaduna",
            "city": "Zaria",
            "abbreviation": "FUZ",
            "website": "http://www.fuz.edu.ng"
        },
        {
            "name": "Gombe State University, Gombe",
            "state": "Gombe",
            "city": "Gombe",
            "abbreviation": "GSU",
            "website": "http://www.gsu.edu.ng"
        },
        {
            "name": "Gregory University, Uturu",
            "state": "Abia",
            "city": "Uturu",
            "abbreviation": "GREGORY",
            "website": "http://www.gregoryuniversity.edu.ng"
        },
        {
            "name": "Hallmark University, Ijebu-Itele",
            "state": "Ogun",
            "city": "Ijebu-Itele",
            "abbreviation": "HALLMARK",
            "website": "http://www.hallmark.edu.ng"
        },
        {
            "name": "Hezekiah University, Umudi",
            "state": "Imo",
            "city": "Umudi",
            "abbreviation": "HEZEKIAH",
            "website": "http://www.hezekiah.edu.ng"
        },
        {
            "name": "Ibrahim Badamasi Babangida University, Lapai",
            "state": "Niger",
            "city": "Lapai",
            "abbreviation": "IBBU",
            "website": "http://www.ibbu.edu.ng"
        },
        {
            "name": "Igbinedion University, Okada",
            "state": "Edo",
            "city": "Okada",
            "abbreviation": "IUO",
            "website": "http://www.iuokada.edu.ng"
        },
        {
            "name": "Ignatius Ajuru University of Education, Rumuolumeni",
            "state": "Rivers",
            "city": "Rumuolumeni",
            "abbreviation": "IAUE",
            "website": "http://www.iaue.edu.ng"
        },
        {
            "name": "Imo State University, Owerri",
            "state": "Imo",
            "city": "Owerri",
            "abbreviation": "IMSU",
            "website": "http://www.imsu.edu.ng"
        },
        {
            "name": "Imperial College, Kaduna",
            "state": "Kaduna",
            "city": "Kaduna",
            "abbreviation": "IMPERIAL",
            "website": "http://www.imperial.edu.ng"
        },
        {
            "name": "Joseph Ayo Babalola University, Ikeji-Arakeji",
            "state": "Osun",
            "city": "Ikeji-Arakeji",
            "abbreviation": "JABU",
            "website": "http://www.jabu.edu.ng"
        },
        {
            "name": "Kaduna State University, Kaduna",
            "state": "Kaduna",
            "city": "Kaduna",
            "abbreviation": "KASU",
            "website": "http://www.kasu.edu.ng"
        },
        {
            "name": "Kano University of Science and Technology, Wudil",
            "state": "Kano",
            "city": "Wudil",
            "abbreviation": "KUST",
            "website": "http://www.kust.edu.ng"
        },
        {
            "name": "Kebbi State University of Science and Technology, Aliero",
            "state": "Kebbi",
            "city": "Aliero",
            "abbreviation": "KSUSTA",
            "website": "http://www.ksusta.edu.ng"
        },
        {
            "name": "Kings University, Ode Omu",
            "state": "Osun",
            "city": "Ode Omu",
            "abbreviation": "KINGSUNI",
            "website": "http://www.kingsuniversity.edu.ng"
        },
        {
            "name": "Kogi State University, Anyigba",
            "state": "Kogi",
            "city": "Anyigba",
            "abbreviation": "KSU",
            "website": "http://www.ksu.edu.ng"
        },
        {
            "name": "Kwara State University, Ilorin",
            "state": "Kwara",
            "city": "Ilorin",
            "abbreviation": "KWASU",
            "website": "http://www.kwasu.edu.ng"
        },
        {
            "name": "Kwararafa University, Wukari",
            "state": "Taraba",
            "city": "Wukari",
            "abbreviation": "KWARARAFA",
            "website": "http://www.kwararafauniversity.edu.ng"
        },
        {
            "name": "Lagos State University, Ojo",
            "state": "Lagos",
            "city": "Ojo",
            "abbreviation": "LASU",
            "website": "http://www.lasu.edu.ng"
        },
        {
            "name": "Landmark University, Omu-Aran",
            "state": "Kwara",
            "city": "Omu-Aran",
            "abbreviation": "LANDMARK",
            "website": "http://www.landmarkuniversity.edu.ng"
        },
        {
            "name": "Lead City University, Ibadan",
            "state": "Oyo",
            "city": "Ibadan",
            "abbreviation": "LCU",
            "website": "http://www.lcu.edu.ng"
        },
        {
            "name": "Legacy University, Okija",
            "state": "Anambra",
            "city": "Okija",
            "abbreviation": "LEGACY",
            "website": "http://www.legacyuniversity.edu.ng"
        },
        {
            "name": "Madonna University, Okija",
            "state": "Anambra",
            "city": "Okija",
            "abbreviation": "MADONNA",
            "website": "http://www.madonnauniversity.edu.ng"
        },
        {
            "name": "Mcpherson University, Seriki Sotayo",
            "state": "Ogun",
            "city": "Seriki Sotayo",
            "abbreviation": "MCU",
            "website": "http://www.mcphersonuniversity.edu.ng"
        },
        {
            "name": "Micheal and Cecilia Ibru University, Agbarha-Otor",
            "state": "Delta",
            "city": "Agbarha-Otor",
            "abbreviation": "MICHAEL",
            "website": "http://www.mciu.edu.ng"
        },
        {
            "name": "Modibbo Adama University of Technology, Yola",
            "state": "Adamawa",
            "city": "Yola",
            "abbreviation": "MAUTECH",
            "website": "http://www.mautech.edu.ng"
        },
        {
            "name": "Mountain Top University, Makogi Oba",
            "state": "Ogun",
            "city": "Makogi Oba",
            "abbreviation": "MTU",
            "website": "http://www.mtu.edu.ng"
        },
        {
            "name": "Nasarawa State University, Keffi",
            "state": "Nasarawa",
            "city": "Keffi",
            "abbreviation": "NSUK",
            "website": "http://www.nsuk.edu.ng"
        },
        {
            "name": "National Open University of Nigeria, Lagos",
            "state": "Lagos",
            "city": "Lagos",
            "abbreviation": "NOUN",
            "website": "http://www.nou.edu.ng"
        },
        {
            "name": "Niger Delta University, Wilberforce Island",
            "state": "Bayelsa",
            "city": "Wilberforce Island",
            "abbreviation": "NDU",
            "website": "http://www.ndu.edu.ng"
        },
        {
            "name": "Nigerian Defence Academy, Kaduna",
            "state": "Kaduna",
            "city": "Kaduna",
            "abbreviation": "NDA",
            "website": "http://www.nda.edu.ng"
        },
        {
            "name": "Nnamdi Azikiwe University, Awka",
            "state": "Anambra",
            "city": "Awka",
            "abbreviation": "UNIZIK",
            "website": "http://www.unizik.edu.ng"
        },
        {
            "name": "Northwest University, Kano",
            "state": "Kano",
            "city": "Kano",
            "abbreviation": "NWU",
            "website": "http://www.nwu.edu.ng"
        },
        {
            "name": "Novena University, Ogume",
            "state": "Delta",
            "city": "Ogume",
            "abbreviation": "NOVENA",
            "website": "http://www.novenauniversity.edu.ng"
        },
        {
            "name": "Nuhu Bamalli Polytechnic, Zaria",
            "state": "Kaduna",
            "city": "Zaria",
            "abbreviation": "NUBAPOLY",
            "website": "http://www.nubapoly.net"
        },
        {
            "name": "Obafemi Awolowo University, Ile-Ife",
            "state": "Osun",
            "city": "Ile-Ife",
            "abbreviation": "OAU",
            "website": "http://www.oauife.edu.ng"
        },
        {
            "name": "Obong University, Obong Ntak",
            "state": "Akwa Ibom",
            "city": "Obong Ntak",
            "abbreviation": "OBONG",
            "website": "http://www.obonguniversity.edu.ng"
        },
        {
            "name": "Oduduwa University, Ile-Ife",
            "state": "Osun",
            "city": "Ile-Ife",
            "abbreviation": "ODUDUWA",
            "website": "http://www.oduduwauniversity.edu.ng"
        },
        {
            "name": "Ogun State Institute of Technology, Igbesa",
            "state": "Ogun",
            "city": "Igbesa",
            "abbreviation": "OGITECH",
            "website": "http://www.ogitech.edu.ng"
        },
        {
            "name": "Ondo State University of Science and Technology, Okitipupa",
            "state": "Ondo",
            "city": "Okitipupa",
            "abbreviation": "OSUSTECH",
            "website": "http://www.osustech.edu.ng"
        },
        {
            "name": "Onabisi Onabanjo University, Ago Iwoye",
            "state": "Ogun",
            "city": "Ago Iwoye",
            "abbreviation": "OOU",
            "website": "http://www.oou.edu.ng"
        },
        {
            "name": "Osun State University, Osogbo",
            "state": "Osun",
            "city": "Osogbo",
            "abbreviation": "UNIOSUN",
            "website": "http://www.uniosun.edu.ng"
        },
        {
            "name": "Oyo State Technical University, Ibadan",
            "state": "Oyo",
            "city": "Ibadan",
            "abbreviation": "OYOTECH",
            "website": "http://www.oyotech.edu.ng"
        },
        {
            "name": "Pan-Atlantic University, Lagos",
            "state": "Lagos",
            "city": "Lagos",
            "abbreviation": "PAU",
            "website": "http://www.pau.edu.ng"
        },
        {
            "name": "Paul University, Awka",
            "state": "Anambra",
            "city": "Awka",
            "abbreviation": "PAUL",
            "website": "http://www.pauluniversity.edu.ng"
        },
        {
            "name": "Plateau State University, Bokkos",
            "state": "Plateau",
            "city": "Bokkos",
            "abbreviation": "PLASU",
            "website": "http://www.plasu.edu.ng"
        },
        {
            "name": "Redeemer\'s University, Ede",
            "state": "Osun",
            "city": "Ede",
            "abbreviation": "RUN",
            "website": "http://www.run.edu.ng"
        },
        {
            "name": "Renaissance University, Enugu",
            "state": "Enugu",
            "city": "Enugu",
            "abbreviation": "RENAISSANCE",
            "website": "http://www.rnu.edu.ng"
        },
        {
            "name": "Rhema University, Aba",
            "state": "Abia",
            "city": "Aba",
            "abbreviation": "RHEMA",
            "website": "http://www.rhemauniversity.edu.ng"
        },
        {
            "name": "Ritman University, Ikot Ekpene",
            "state": "Akwa Ibom",
            "city": "Ikot Ekpene",
            "abbreviation": "RITMAN",
            "website": "http://www.ritmanuniversity.edu.ng"
        },
        {
            "name": "Rivers State University of Science and Technology, Port Harcourt",
            "state": "Rivers",
            "city": "Port Harcourt",
            "abbreviation": "RSUST",
            "website": "http://www.rsu.edu.ng"
        },
        {
            "name": "Salem University, Lokoja",
            "state": "Kogi",
            "city": "Lokoja",
            "abbreviation": "SALEM",
            "website": "http://www.salemuniversity.edu.ng"
        },
        {
            "name": "Samuel Adegboyega University, Ogwa",
            "state": "Edo",
            "city": "Ogwa",
            "abbreviation": "SAU",
            "website": "http://www.sau.edu.ng"
        },
        {
            "name": "Sokoto State University, Sokoto",
            "state": "Sokoto",
            "city": "Sokoto",
            "abbreviation": "SSU",
            "website": "http://www.ssu.edu.ng"
        },
        {
            "name": "Southwestern University, Okun Owa",
            "state": "Ogun",
            "city": "Okun Owa",
            "abbreviation": "SWU",
            "website": "http://www.swu.edu.ng"
        },
        {
            "name": "Sule Lamido University, Kafin Hausa",
            "state": "Jigawa",
            "city": "Kafin Hausa",
            "abbreviation": "SLU",
            "website": "http://www.slu.edu.ng"
        },
        {
            "name": "Summit University, Offa",
            "state": "Kwara",
            "city": "Offa",
            "abbreviation": "SUMMITUNI",
            "website": "http://www.summituniversity.edu.ng"
        },
        {
            "name": "Tai Solarin University of Education, Ijebu-Ode",
            "state": "Ogun",
            "city": "Ijebu-Ode",
            "abbreviation": "TASUED",
            "website": "http://www.tasued.edu.ng"
        },
        {
            "name": "Taraba State University, Jalingo",
            "state": "Taraba",
            "city": "Jalingo",
            "abbreviation": "TSUJ",
            "website": "http://www.tsuniversity.edu.ng"
        },
        {
            "name": "The Technical University, Ibadan",
            "state": "Oyo",
            "city": "Ibadan",
            "abbreviation": "TECH-U",
            "website": "http://www.tech-u.edu.ng"
        },
        {
            "name": "Umaru Musa Yar\'adua University, Katsina",
            "state": "Katsina",
            "city": "Katsina",
            "abbreviation": "UMYU",
            "website": "http://www.umyu.edu.ng"
        },
        {
            "name": "University of Abuja, Abuja",
            "state": "Federal Capital Territory",
            "city": "Abuja",
            "abbreviation": "UNIABUJA",
            "website": "http://www.uniabuja.edu.ng"
        },
        {
            "name": "University of Agriculture, Makurdi",
            "state": "Benue",
            "city": "Makurdi",
            "abbreviation": "UAM",
            "website": "http://www.uam.edu.ng"
        },
        {
            "name": "University of Benin, Benin City",
            "state": "Edo",
            "city": "Benin City",
            "abbreviation": "UNIBEN",
            "website": "http://www.uniben.edu.ng"
        },
        {
            "name": "University of Calabar, Calabar",
            "state": "Cross River",
            "city": "Calabar",
            "abbreviation": "UNICAL",
            "website": "http://www.unical.edu.ng"
        },
        {
            "name": "University of Ibadan, Ibadan",
            "state": "Oyo",
            "city": "Ibadan",
            "abbreviation": "UI",
            "website": "http://www.ui.edu.ng"
        },
        {
            "name": "University of Ilorin, Ilorin",
            "state": "Kwara",
            "city": "Ilorin",
            "abbreviation": "UNILORIN",
            "website": "http://www.unilorin.edu.ng"
        },
        {
            "name": "University of Jos, Jos",
            "state": "Plateau",
            "city": "Jos",
            "abbreviation": "UNIJOS",
            "website": "http://www.unijos.edu.ng"
        },
        {
            "name": "University of Lagos, Lagos",
            "state": "Lagos",
            "city": "Lagos",
            "abbreviation": "UNILAG",
            "website": "http://www.unilag.edu.ng"
        },
        {
            "name": "University of Maiduguri, Maiduguri",
            "state": "Borno",
            "city": "Maiduguri",
            "abbreviation": "UNIMAID",
            "website": "http://www.unimaid.edu.ng"
        },
        {
            "name": "University of Medical Sciences, Ondo",
            "state": "Ondo",
            "city": "Ondo",
            "abbreviation": "UNIMED",
            "website": "http://www.unimed.edu.ng"
        },
        {
            "name": "University of Mkar, Gboko",
            "state": "Benue",
            "city": "Gboko",
            "abbreviation": "UNIMKAR",
            "website": "http://www.unimkar.edu.ng"
        },
        {
            "name": "University of Nigeria, Nsukka",
            "state": "Enugu",
            "city": "Nsukka",
            "abbreviation": "UNN",
            "website": "http://www.unn.edu.ng"
        },
        {
            "name": "University of Port Harcourt, Port Harcourt",
            "state": "Rivers",
            "city": "Port Harcourt",
            "abbreviation": "UNIPORT",
            "website": "http://www.uniport.edu.ng"
        },
        {
            "name": "University of Uyo, Uyo",
            "state": "Akwa Ibom",
            "city": "Uyo",
            "abbreviation": "UNIUYO",
            "website": "http://www.uniuyo.edu.ng"
        },
        {
            "name": "Usmanu Danfodiyo University, Sokoto",
            "state": "Sokoto",
            "city": "Sokoto",
            "abbreviation": "UDUSOK",
            "website": "http://www.udusok.edu.ng"
        },
        {
            "name": "Veritas University, Abuja",
            "state": "Federal Capital Territory",
            "city": "Abuja",
            "abbreviation": "VERITAS",
            "website": "http://www.veritas.edu.ng"
        },
        {
            "name": "Wellspring University, Benin City",
            "state": "Edo",
            "city": "Benin City",
            "abbreviation": "WELLSPRING",
            "website": "http://www.wellspringuniversity.edu.ng"
        },
        {
            "name": "Wesley University of Science and Technology, Ondo",
            "state": "Ondo",
            "city": "Ondo",
            "abbreviation": "WUSTO",
            "website": "http://www.wusto.edu.ng"
        },
        {
            "name": "Western Delta University, Oghara",
            "state": "Delta",
            "city": "Oghara",
            "abbreviation": "WDU",
            "website": "http://www.wduniversity.edu.ng"
        },
        {
            "name": "Yobe State University, Damaturu",
            "state": "Yobe",
            "city": "Damaturu",
            "abbreviation": "YSU",
            "website": "http://www.ysu.edu.ng"
        },
        {
            "name": "Yusuf Maitama Sule University, Kano",
            "state": "Kano",
            "city": "Kano",
            "abbreviation": "YUMSUK",
            "website": "http://www.yusufmsuk.edu.ng"
        }
    ]

// Export as an object with universities property to match your import
const universitiesData = {
    universities
};

export default universitiesData;