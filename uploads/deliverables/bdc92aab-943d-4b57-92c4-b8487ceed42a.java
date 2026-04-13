package com.example.tpfoyer.services;

import com.example.tpfoyer.entity.bloc;
import com.example.tpfoyer.entity.chambre;
import com.example.tpfoyer.repository.BlocRepository;
import com.example.tpfoyer.repository.ChambreRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChambreService implements IChambreInterface {
    @Autowired

    ChambreRepository chambreRepository;
    @Autowired
    BlocRepository blocRepository;
    @Override
    public List<chambre> retrieveAllChambres() {
        return chambreRepository.findAll();
    }

    @Override
    public chambre retrieveChambre(Long chambreId) {
        return chambreRepository.findById(chambreId).get();
    }

    @Override
    public chambre addChambre(chambre c) {
        return chambreRepository.save(c);    }

    @Override
    public void removeChambre(Long chambreId) {
        chambreRepository.deleteById(chambreId);

    }

    @Override
    public chambre modifyChambre(chambre chambre) {
        return chambreRepository.save(chambre);
    }
    @Override
    public bloc affecterChambresABloc(List<Long> numChambre, long idBloc) {
        bloc b  = blocRepository.findById(idBloc).get();
        if(b==null)
            return null;
        else {
            for(Long num : numChambre) {
                chambre c = chambreRepository.findByNumeroChambre(num);

                if (c != null) {
                    c.setBloc(b);
                    chambreRepository.save(c);
                }
            }
            return b;
        }
    }
}
