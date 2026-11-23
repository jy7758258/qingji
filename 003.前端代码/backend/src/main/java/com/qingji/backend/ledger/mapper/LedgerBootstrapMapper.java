package com.qingji.backend.ledger.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface LedgerBootstrapMapper {

    @Update("CALL ledger_bootstrap_user(#{userId})")
    int bootstrapUser(@Param("userId") String userId);
}
