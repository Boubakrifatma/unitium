-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost
-- Généré le : ven. 10 avr. 2026 à 12:39
-- Version du serveur : 10.4.28-MariaDB
-- Version de PHP : 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `tpfoyerdb`
--

-- --------------------------------------------------------

--
-- Structure de la table `bloc`
--

CREATE TABLE `bloc` (
  `id_bloc` bigint(20) NOT NULL,
  `capacite_bloc` bigint(20) DEFAULT NULL,
  `nom_bloc` varchar(255) DEFAULT NULL,
  `foyer_id` bigint(20) DEFAULT NULL,
  `foyer_id_foyer` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `bloc`
--

INSERT INTO `bloc` (`id_bloc`, `capacite_bloc`, `nom_bloc`, `foyer_id`, `foyer_id_foyer`) VALUES
(1, 50, 'Bloc A', NULL, 1),
(2, 60, 'Bloc B', NULL, 1),
(3, 40, 'Bloc C', NULL, 2);

-- --------------------------------------------------------

--
-- Structure de la table `chambre`
--

CREATE TABLE `chambre` (
  `id_chambre` bigint(20) NOT NULL,
  `numero_chambre` bigint(20) DEFAULT NULL,
  `typec` enum('DOUBLE','SIMPLE','TRIPLE') DEFAULT NULL,
  `bloc_id_bloc` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `chambre`
--

INSERT INTO `chambre` (`id_chambre`, `numero_chambre`, `typec`, `bloc_id_bloc`) VALUES
(1, 101, 'SIMPLE', 1),
(2, 102, 'DOUBLE', 1),
(3, 103, 'TRIPLE', 1),
(4, 201, 'SIMPLE', 2),
(5, 202, 'DOUBLE', 2),
(6, 301, 'SIMPLE', 3);

-- --------------------------------------------------------

--
-- Structure de la table `chambre_reservations`
--

CREATE TABLE `chambre_reservations` (
  `chambre_id_chambre` bigint(20) NOT NULL,
  `reservations_id_reservation` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `chambre_reservations`
--

INSERT INTO `chambre_reservations` (`chambre_id_chambre`, `reservations_id_reservation`) VALUES
(3, '103-Bloc A-2026');

-- --------------------------------------------------------

--
-- Structure de la table `etudiant`
--

CREATE TABLE `etudiant` (
  `id_etudiant` bigint(20) NOT NULL,
  `cin` bigint(20) DEFAULT NULL,
  `date_naissance` datetime(6) DEFAULT NULL,
  `ecole` varchar(255) DEFAULT NULL,
  `nom_et` varchar(255) DEFAULT NULL,
  `prenom_et` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `etudiant`
--

INSERT INTO `etudiant` (`id_etudiant`, `cin`, `date_naissance`, `ecole`, `nom_et`, `prenom_et`) VALUES
(1, 12345678, '2026-04-10 11:22:47.000000', 'ESPRIT', 'Ben Ali', 'Mohamed'),
(2, 87654321, '2026-04-10 11:22:47.000000', 'ENSI', 'Trabelsi', 'Sarra'),
(3, 11223344, '2026-04-10 11:22:47.000000', 'ESPRIT', 'Hamdi', 'Amine');

-- --------------------------------------------------------

--
-- Structure de la table `etudiant_reservations`
--

CREATE TABLE `etudiant_reservations` (
  `etudiant_id_etudiant` bigint(20) NOT NULL,
  `reservations_id_reservation` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `foyer`
--

CREATE TABLE `foyer` (
  `id_foyer` bigint(20) NOT NULL,
  `capacite_foyer` bigint(20) DEFAULT NULL,
  `nom_foyer` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `foyer`
--

INSERT INTO `foyer` (`id_foyer`, `capacite_foyer`, `nom_foyer`) VALUES
(1, 200, 'Foyer ESPRIT'),
(2, 150, 'Foyer ENSI'),
(3, 50, 'Foyer Test');

-- --------------------------------------------------------

--
-- Structure de la table `reservation`
--

CREATE TABLE `reservation` (
  `id_reservation` varchar(255) NOT NULL,
  `annee_universitaire` datetime(6) DEFAULT NULL,
  `est_valide` bit(1) NOT NULL,
  `chambre_id_chambre` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `reservation`
--

INSERT INTO `reservation` (`id_reservation`, `annee_universitaire`, `est_valide`, `chambre_id_chambre`) VALUES
('101-Bloc A-2026', '2026-04-10 11:28:31.000000', b'0', NULL),
('103-Bloc A-2026', '2026-04-10 11:28:59.000000', b'1', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `reservation_etudiants`
--

CREATE TABLE `reservation_etudiants` (
  `reservations_id_reservation` varchar(255) NOT NULL,
  `etudiants_id_etudiant` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `reservation_etudiants`
--

INSERT INTO `reservation_etudiants` (`reservations_id_reservation`, `etudiants_id_etudiant`) VALUES
('103-Bloc A-2026', 2);

-- --------------------------------------------------------

--
-- Structure de la table `universite`
--

CREATE TABLE `universite` (
  `id_universite` bigint(20) NOT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `nom_universite` varchar(255) DEFAULT NULL,
  `foyer_id` bigint(20) DEFAULT NULL,
  `foyer_id_foyer` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `universite`
--

INSERT INTO `universite` (`id_universite`, `adresse`, `nom_universite`, `foyer_id`, `foyer_id_foyer`) VALUES
(1, 'Ariana, Tunis', 'ESPRIT', NULL, NULL),
(2, 'Manouba, Tunis', 'ENSI', NULL, 3);

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `bloc`
--
ALTER TABLE `bloc`
  ADD PRIMARY KEY (`id_bloc`),
  ADD KEY `FK4elg0453qn92wptvyt9na65fr` (`foyer_id`),
  ADD KEY `FKrlx3b5jtde0ftmmrcqbifn0pt` (`foyer_id_foyer`);

--
-- Index pour la table `chambre`
--
ALTER TABLE `chambre`
  ADD PRIMARY KEY (`id_chambre`),
  ADD KEY `FKe3jmwbj3ohvcd61fqhgivoe9j` (`bloc_id_bloc`);

--
-- Index pour la table `chambre_reservations`
--
ALTER TABLE `chambre_reservations`
  ADD PRIMARY KEY (`chambre_id_chambre`,`reservations_id_reservation`),
  ADD UNIQUE KEY `UK_lhhok2kyd975dqwp4cuo2w6df` (`reservations_id_reservation`);

--
-- Index pour la table `etudiant`
--
ALTER TABLE `etudiant`
  ADD PRIMARY KEY (`id_etudiant`);

--
-- Index pour la table `etudiant_reservations`
--
ALTER TABLE `etudiant_reservations`
  ADD PRIMARY KEY (`etudiant_id_etudiant`,`reservations_id_reservation`),
  ADD KEY `FKfyd75pdsvsc6gxyq9yh2nxjan` (`reservations_id_reservation`);

--
-- Index pour la table `foyer`
--
ALTER TABLE `foyer`
  ADD PRIMARY KEY (`id_foyer`);

--
-- Index pour la table `reservation`
--
ALTER TABLE `reservation`
  ADD PRIMARY KEY (`id_reservation`),
  ADD KEY `FK4m8kecnqoee6fogte3il1ulhj` (`chambre_id_chambre`);

--
-- Index pour la table `reservation_etudiants`
--
ALTER TABLE `reservation_etudiants`
  ADD PRIMARY KEY (`reservations_id_reservation`,`etudiants_id_etudiant`),
  ADD KEY `FK53dc9htdv7ne29h80i08urcqv` (`etudiants_id_etudiant`);

--
-- Index pour la table `universite`
--
ALTER TABLE `universite`
  ADD PRIMARY KEY (`id_universite`),
  ADD UNIQUE KEY `UK52y6lyhd0w9kqrjbg9f0l3vov` (`foyer_id`),
  ADD UNIQUE KEY `UK_shp3tdxapicb48phb2shb39gu` (`foyer_id_foyer`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `bloc`
--
ALTER TABLE `bloc`
  MODIFY `id_bloc` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `chambre`
--
ALTER TABLE `chambre`
  MODIFY `id_chambre` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `etudiant`
--
ALTER TABLE `etudiant`
  MODIFY `id_etudiant` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `foyer`
--
ALTER TABLE `foyer`
  MODIFY `id_foyer` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `universite`
--
ALTER TABLE `universite`
  MODIFY `id_universite` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `bloc`
--
ALTER TABLE `bloc`
  ADD CONSTRAINT `FK4elg0453qn92wptvyt9na65fr` FOREIGN KEY (`foyer_id`) REFERENCES `foyer` (`id_foyer`),
  ADD CONSTRAINT `FKrlx3b5jtde0ftmmrcqbifn0pt` FOREIGN KEY (`foyer_id_foyer`) REFERENCES `foyer` (`id_foyer`);

--
-- Contraintes pour la table `chambre`
--
ALTER TABLE `chambre`
  ADD CONSTRAINT `FKe3jmwbj3ohvcd61fqhgivoe9j` FOREIGN KEY (`bloc_id_bloc`) REFERENCES `bloc` (`id_bloc`);

--
-- Contraintes pour la table `chambre_reservations`
--
ALTER TABLE `chambre_reservations`
  ADD CONSTRAINT `FKhx2j8u5cpdmo8pptjvnsjqwma` FOREIGN KEY (`reservations_id_reservation`) REFERENCES `reservation` (`id_reservation`),
  ADD CONSTRAINT `FKqy33yndadmosa4l31qk6v3vm2` FOREIGN KEY (`chambre_id_chambre`) REFERENCES `chambre` (`id_chambre`);

--
-- Contraintes pour la table `etudiant_reservations`
--
ALTER TABLE `etudiant_reservations`
  ADD CONSTRAINT `FKfyd75pdsvsc6gxyq9yh2nxjan` FOREIGN KEY (`reservations_id_reservation`) REFERENCES `reservation` (`id_reservation`),
  ADD CONSTRAINT `FKpo0q6o2t3iplu0keh21dwd1gr` FOREIGN KEY (`etudiant_id_etudiant`) REFERENCES `etudiant` (`id_etudiant`);

--
-- Contraintes pour la table `reservation`
--
ALTER TABLE `reservation`
  ADD CONSTRAINT `FK4m8kecnqoee6fogte3il1ulhj` FOREIGN KEY (`chambre_id_chambre`) REFERENCES `chambre` (`id_chambre`);

--
-- Contraintes pour la table `reservation_etudiants`
--
ALTER TABLE `reservation_etudiants`
  ADD CONSTRAINT `FK53dc9htdv7ne29h80i08urcqv` FOREIGN KEY (`etudiants_id_etudiant`) REFERENCES `etudiant` (`id_etudiant`),
  ADD CONSTRAINT `FKr9q9iw0kkhggmvjpnlv00h385` FOREIGN KEY (`reservations_id_reservation`) REFERENCES `reservation` (`id_reservation`);

--
-- Contraintes pour la table `universite`
--
ALTER TABLE `universite`
  ADD CONSTRAINT `FK2b4r95emuv9ea1064hjqxpqq` FOREIGN KEY (`foyer_id_foyer`) REFERENCES `foyer` (`id_foyer`),
  ADD CONSTRAINT `FK3try7264evt5uuanshfkuwuy8` FOREIGN KEY (`foyer_id`) REFERENCES `foyer` (`id_foyer`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
